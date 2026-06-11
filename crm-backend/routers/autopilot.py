"""
Autopilot routes — AI autonomous marketing agent.

Provides endpoints to trigger agent campaign planning, review
agent plans, and approve/reject planned autopilot campaigns.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import AutopilotRun, Campaign, CampaignStatus, ChannelType, AutopilotStatus
from schemas import AutopilotRunRequest, AutopilotPlanResponse
from services.autopilot_service import run_autopilot
from services.segment_service import build_segment

router = APIRouter()


@router.post("/run", response_model=AutopilotPlanResponse, status_code=200)
async def post_autopilot_run(
    body: AutopilotRunRequest,
    db: Session = Depends(get_db),
) -> AutopilotPlanResponse:
    """
    Execute the multi-step AI agent to plan a campaign for the given goal.
    Saves the plan details in the database and returns it.
    """
    # Execute the agent service
    plan = await run_autopilot(body.goal, db)

    # Save AutopilotRun record
    run = AutopilotRun(
        id=uuid.UUID(plan["run_id"]),
        goal=body.goal,
        plan_data=plan,
        status=AutopilotStatus.PLANNED,
        created_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.commit()

    return AutopilotPlanResponse(**plan)


@router.get("/{run_id}", response_model=AutopilotPlanResponse)
async def get_autopilot_run(
    run_id: str,
    db: Session = Depends(get_db),
) -> AutopilotPlanResponse:
    """Retrieve an existing AI agent campaign plan by its run ID."""
    run = (
        db.query(AutopilotRun)
        .filter(AutopilotRun.id == uuid.UUID(run_id))
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="Autopilot run not found")

    return AutopilotPlanResponse(**run.plan_data)


@router.post("/{run_id}/approve", status_code=200)
async def post_autopilot_approve(
    run_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    """
    Approve the AI agent's plan, generate a live campaign, and fire it.
    Returns the generated campaign ID.
    """
    run = (
        db.query(AutopilotRun)
        .filter(AutopilotRun.id == uuid.UUID(run_id))
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="Autopilot run not found")

    if run.status != AutopilotStatus.PLANNED:
        raise HTTPException(status_code=400, detail="Plan already approved or rejected")

    plan = run.plan_data
    channel = ChannelType(plan["channel"])

    # Create Campaign record
    campaign = Campaign(
        id=uuid.uuid4(),
        name=plan["campaign_name"],
        insight_id=None,
        segment_query=plan["segment_params"],
        channel=channel,
        status=CampaignStatus.RUNNING,
        created_at=datetime.now(timezone.utc),
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Build Segment
    customers = build_segment(plan["segment_params"], db)
    if not customers:
        campaign.status = CampaignStatus.COMPLETED
        db.commit()
        raise HTTPException(status_code=400, detail="No customers match the segment criteria.")

    # Update AutopilotRun status
    run.status = AutopilotStatus.APPROVED
    run.campaign_id = campaign.id
    db.commit()

    # Trigger campaign delivery in background
    background_tasks.add_task(
        _run_autopilot_campaign,
        campaign.id,
        customers,
        plan["message"],
        plan["channel"],
    )

    return {"campaign_id": campaign.id}


@router.post("/{run_id}/reject", status_code=200)
async def post_autopilot_reject(
    run_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Reject the AI agent's proposed plan."""
    run = (
        db.query(AutopilotRun)
        .filter(AutopilotRun.id == uuid.UUID(run_id))
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="Autopilot run not found")

    if run.status != AutopilotStatus.PLANNED:
        raise HTTPException(status_code=400, detail="Plan already approved or rejected")

    run.status = AutopilotStatus.REJECTED
    db.commit()

    return {"status": "rejected"}


async def _run_autopilot_campaign(
    campaign_id: uuid.UUID,
    customers: list,
    message_text: str,
    channel: str,
) -> None:
    """Background task handler for dispatching autopilot campaign messages."""
    from database import SessionLocal
    from services.campaign_service import fire_campaign

    db = SessionLocal()
    try:
        await fire_campaign(campaign_id, customers, message_text, channel, db)
    finally:
        db.close()
