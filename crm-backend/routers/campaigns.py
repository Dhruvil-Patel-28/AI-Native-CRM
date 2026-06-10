"""
Campaign routes — preview, confirm, list, and status.

Orchestrates the campaign lifecycle:
- Preview: AI generates intent, segment, and message drafts
- Confirm: Creates and fires a campaign as a background task
- Status: Returns live campaign stats and recent message updates
- List: Returns all campaigns for the dashboard
"""

import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from models import AIInsight, Campaign, CampaignStatus, ChannelType, Message
from schemas import (
    CampaignConfirmRequest,
    CampaignConfirmResponse,
    CampaignOut,
    CampaignPreviewRequest,
    CampaignPreviewResponse,
    CampaignStatusResponse,
    MessageOut,
    SegmentStats,
)
from services.ai_service import preview_campaign, summarize_results
from services.campaign_service import fire_campaign
from services.segment_service import build_segment, get_segment_stats

router = APIRouter()


@router.post("/preview", response_model=CampaignPreviewResponse)
async def preview(
    body: CampaignPreviewRequest,
    db: Session = Depends(get_db),
) -> CampaignPreviewResponse:
    """
    Generate an AI-powered campaign preview from an insight card.

    Loads the insight from the database, calls the AI service for
    campaign planning, builds the customer segment, and returns
    the full preview with segment statistics.
    """
    # Load insight
    insight = (
        db.query(AIInsight)
        .filter(AIInsight.id == uuid.UUID(body.insight_id))
        .first()
    )
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    # Prepare insight data for AI
    insight_data = {
        "insight_type": insight.insight_type,
        "insight_text": insight.insight_text,
        "segment_data": insight.segment_data or {},
        "priority": insight.priority,
    }

    # Generate campaign preview via AI
    ai_preview = preview_campaign(insight_data, refinement=body.refinement_text)

    # Build segment from AI-suggested params
    segment_params = ai_preview.get("segment_params", insight.segment_data or {})
    customers = build_segment(segment_params, db)
    stats = get_segment_stats(customers, db)

    return CampaignPreviewResponse(
        intent_text=ai_preview.get("intent_text", ""),
        segment_params=segment_params,
        whatsapp_message=ai_preview.get("whatsapp_message", ""),
        email_message=ai_preview.get("email_message", ""),
        channel_recommendation=ai_preview.get("channel_recommendation", "whatsapp"),
        channel_reason=ai_preview.get("channel_reason", ""),
        segment_stats=SegmentStats(**stats),
        customer_count=stats["count"],
    )


@router.post("/confirm", response_model=CampaignConfirmResponse, status_code=201)
async def confirm(
    body: CampaignConfirmRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> CampaignConfirmResponse:
    """
    Confirm and fire a campaign.

    Creates a Campaign record with status=running, builds the customer
    segment, and launches message delivery as a background task.
    Returns immediately with the campaign ID and customer count.
    """
    # Resolve channel enum
    channel = ChannelType(body.channel)

    # Create campaign record
    campaign = Campaign(
        id=uuid.uuid4(),
        name=body.campaign_name,
        insight_id=uuid.UUID(body.insight_id) if body.insight_id else None,
        segment_query=body.segment_params,
        channel=channel,
        status=CampaignStatus.RUNNING,
        created_at=datetime.now(timezone.utc),
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Mark insight as acted on
    if body.insight_id:
        insight = (
            db.query(AIInsight)
            .filter(AIInsight.id == uuid.UUID(body.insight_id))
            .first()
        )
        if insight:
            insight.is_acted_on = True
            db.commit()

    # Build segment
    customers = build_segment(body.segment_params, db)
    if not customers:
        campaign.status = CampaignStatus.COMPLETED
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="No customers match the segment criteria.",
        )

    # Fire campaign in background
    background_tasks.add_task(
        _run_campaign,
        campaign.id,
        customers,
        body.message_text,
        body.channel,
    )

    return CampaignConfirmResponse(
        campaign_id=campaign.id,
        customer_count=len(customers),
        status="firing",
    )


async def _run_campaign(
    campaign_id: uuid.UUID,
    customers: list,
    message_text: str,
    channel: str,
) -> None:
    """
    Background task wrapper for fire_campaign.

    Opens a fresh DB session for the background context since
    the original request session is closed by the time this runs.
    """
    from database import SessionLocal

    db = SessionLocal()
    try:
        await fire_campaign(campaign_id, customers, message_text, channel, db)
    finally:
        db.close()


@router.get("/{campaign_id}/status", response_model=CampaignStatusResponse)
async def get_campaign_status(
    campaign_id: str,
    db: Session = Depends(get_db),
) -> CampaignStatusResponse:
    """
    Get campaign status with recent message updates.

    Returns the campaign record with all aggregate counters and
    the last 20 message status updates for the live feed.
    """
    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == uuid.UUID(campaign_id))
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Check if campaign should be marked completed
    # (all messages have settled = no messages in 'sent' status)
    if campaign.status == CampaignStatus.RUNNING and campaign.total_sent > 0:
        pending_count = (
            db.query(Message)
            .filter(
                Message.campaign_id == campaign.id,
                Message.status == "sent",
            )
            .count()
        )
        if pending_count == 0:
            campaign.status = CampaignStatus.COMPLETED
            db.commit()

    # Generate AI summary for completed campaigns (cached in DB after first generation)
    ai_summary = campaign.ai_summary
    if campaign.status == CampaignStatus.COMPLETED and campaign.total_sent > 0 and not ai_summary:
        delivery_rate = (
            (campaign.total_delivered / campaign.total_sent * 100)
            if campaign.total_sent > 0
            else 0
        )
        open_rate = (
            (campaign.total_opened / campaign.total_delivered * 100)
            if campaign.total_delivered > 0
            else 0
        )
        click_rate = (
            (campaign.total_clicked / campaign.total_opened * 100)
            if campaign.total_opened > 0
            else 0
        )

        summary_data = summarize_results({
            "name": campaign.name,
            "channel": campaign.channel.value,
            "total_sent": campaign.total_sent,
            "total_delivered": campaign.total_delivered,
            "total_opened": campaign.total_opened,
            "total_clicked": campaign.total_clicked,
            "total_failed": campaign.total_failed,
            "revenue_attributed": campaign.revenue_attributed,
            "delivery_rate": delivery_rate,
            "open_rate": open_rate,
            "click_rate": click_rate,
        })
        ai_summary = summary_data.get("summary", "")
        recommendation = summary_data.get("recommendation", "")
        if recommendation:
            ai_summary += f"\n\n💡 {recommendation}"

        # Persist summary to avoid regenerating on every poll
        campaign.ai_summary = ai_summary
        db.commit()

    # Get last 20 messages for live feed
    recent_messages_raw = (
        db.query(Message)
        .filter(Message.campaign_id == campaign.id)
        .order_by(desc(Message.sent_at))
        .limit(20)
        .all()
    )

    recent_messages = []
    for msg in recent_messages_raw:
        customer = msg.customer
        recent_messages.append(
            MessageOut(
                id=msg.id,
                campaign_id=msg.campaign_id,
                customer_id=msg.customer_id,
                message_text=msg.message_text,
                channel=msg.channel.value,
                status=msg.status.value,
                sent_at=msg.sent_at,
                delivered_at=msg.delivered_at,
                opened_at=msg.opened_at,
                clicked_at=msg.clicked_at,
                customer_name=customer.name if customer else None,
            )
        )

    campaign_out = CampaignOut(
        id=campaign.id,
        name=campaign.name,
        insight_id=campaign.insight_id,
        segment_query=campaign.segment_query,
        channel=campaign.channel.value,
        status=campaign.status.value,
        created_at=campaign.created_at,
        total_sent=campaign.total_sent,
        total_delivered=campaign.total_delivered,
        total_opened=campaign.total_opened,
        total_clicked=campaign.total_clicked,
        total_failed=campaign.total_failed,
        revenue_attributed=campaign.revenue_attributed,
        ai_summary=ai_summary,
    )

    return CampaignStatusResponse(
        campaign=campaign_out,
        recent_messages=recent_messages,
    )


@router.get("", response_model=list[CampaignOut])
async def list_campaigns(
    db: Session = Depends(get_db),
) -> list[CampaignOut]:
    """
    List all campaigns ordered by creation date (newest first).

    Returns campaign records with all aggregate delivery stats.
    """
    campaigns = (
        db.query(Campaign)
        .order_by(desc(Campaign.created_at))
        .all()
    )

    return [
        CampaignOut(
            id=c.id,
            name=c.name,
            insight_id=c.insight_id,
            segment_query=c.segment_query,
            channel=c.channel.value,
            status=c.status.value,
            created_at=c.created_at,
            total_sent=c.total_sent,
            total_delivered=c.total_delivered,
            total_opened=c.total_opened,
            total_clicked=c.total_clicked,
            total_failed=c.total_failed,
            revenue_attributed=c.revenue_attributed,
        )
        for c in campaigns
    ]
