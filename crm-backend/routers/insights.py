"""
Insight routes — AI-generated customer insights.

Queries the database for aggregate customer stats across the four
behavioural segments, passes them to the AI service, persists the
generated insights, and returns them as prioritized insight cards.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import AIInsight, Campaign, CampaignStatus, Order
from schemas import InsightOut
from services.ai_service import generate_insights

router = APIRouter()


@router.get("", response_model=list[InsightOut])
async def get_insights(db: Session = Depends(get_db)) -> list[InsightOut]:
    """
    Generate AI insights from current customer data.

    Computes aggregate stats (segment counts, average order value,
    top product, last campaign metrics), sends them to the AI service,
    saves the resulting insights to the database, and returns them
    sorted by priority.
    """
    now = datetime.now(timezone.utc)

    # --- Aggregate customer stats ---

    # Total customers
    total_customers = db.query(func.count(Order.customer_id.distinct())).scalar() or 0

    # Loyal: ordered in last 30 days AND 5+ orders
    loyal_subq = (
        db.query(Order.customer_id)
        .group_by(Order.customer_id)
        .having(
            func.max(Order.ordered_at) >= now - timedelta(days=30),
            func.count(Order.id) >= 5,
        )
        .subquery()
    )
    loyal_count = db.query(func.count()).select_from(loyal_subq).scalar() or 0

    # At-risk: last order 45-60 days ago
    at_risk_subq = (
        db.query(Order.customer_id)
        .group_by(Order.customer_id)
        .having(
            func.max(Order.ordered_at).between(
                now - timedelta(days=60), now - timedelta(days=45)
            )
        )
        .subquery()
    )
    at_risk_count = db.query(func.count()).select_from(at_risk_subq).scalar() or 0

    # Lapsed: last order 90+ days ago
    lapsed_subq = (
        db.query(Order.customer_id)
        .group_by(Order.customer_id)
        .having(func.max(Order.ordered_at) <= now - timedelta(days=90))
        .subquery()
    )
    lapsed_count = db.query(func.count()).select_from(lapsed_subq).scalar() or 0

    # New: first order in last 30 days (i.e. only one order, recent)
    new_subq = (
        db.query(Order.customer_id)
        .group_by(Order.customer_id)
        .having(
            func.min(Order.ordered_at) >= now - timedelta(days=30),
            func.count(Order.id) == 1,
        )
        .subquery()
    )
    new_count = db.query(func.count()).select_from(new_subq).scalar() or 0

    # Average order value
    avg_order_value = db.query(func.avg(Order.amount)).scalar() or 0.0

    # Top product category
    top_product_row = (
        db.query(Order.product_category, func.count(Order.id).label("cnt"))
        .group_by(Order.product_category)
        .order_by(func.count(Order.id).desc())
        .first()
    )
    top_product_category = top_product_row[0] if top_product_row else "Unknown"

    # Last completed campaign metrics
    last_campaign = (
        db.query(Campaign)
        .filter(Campaign.status == CampaignStatus.COMPLETED)
        .order_by(Campaign.created_at.desc())
        .first()
    )
    last_campaign_open_rate = None
    last_campaign_channel = None
    if last_campaign and last_campaign.total_delivered > 0:
        last_campaign_open_rate = round(
            (last_campaign.total_opened / last_campaign.total_delivered) * 100, 1
        )
        last_campaign_channel = last_campaign.channel.value

    # --- Generate insights via AI ---
    db_stats = {
        "total_customers": total_customers,
        "loyal_count": loyal_count,
        "at_risk_count": at_risk_count,
        "lapsed_count": lapsed_count,
        "new_count": new_count,
        "avg_order_value": round(float(avg_order_value), 2),
        "top_product_category": top_product_category,
        "last_campaign_open_rate": last_campaign_open_rate,
        "last_campaign_channel": last_campaign_channel,
    }

    raw_insights = generate_insights(db_stats)
    if not raw_insights:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate insights. Please try again.",
        )

    # --- Persist insights to DB ---
    # Remove stale, un-acted-on insights to prevent duplication.
    # Insights already linked to campaigns are preserved for audit trail.
    db.query(AIInsight).filter(AIInsight.is_acted_on == False).delete()  # noqa: E712
    db.flush()

    saved_insights: list[InsightOut] = []
    for raw in raw_insights:
        insight = AIInsight(
            insight_type=raw["insight_type"],
            insight_text=raw["insight_text"],
            segment_data=raw.get("segment_data", {}),
            priority=raw["priority"],
        )
        db.add(insight)
        db.flush()

        saved_insights.append(
            InsightOut(
                id=insight.id,
                insight_type=insight.insight_type,
                insight_text=insight.insight_text,
                segment_data=insight.segment_data,
                priority=insight.priority,
                created_at=insight.created_at,
                is_acted_on=insight.is_acted_on,
                stat=raw.get("stat"),
                potential_revenue=raw.get("potential_revenue"),
            )
        )

    db.commit()

    return sorted(saved_insights, key=lambda i: i.priority)
