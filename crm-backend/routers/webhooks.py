"""
Webhook routes — delivery receipt callbacks from the channel stub.

Processes delivery status updates (delivered, opened, clicked, failed)
with idempotency checks and atomic counter updates on the parent campaign.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from database import get_db
from models import Campaign, Message, MessageStatus
from schemas import WebhookReceipt

logger = logging.getLogger(__name__)

# Maps status strings to their progression order for idempotency
STATUS_ORDER: dict[str, int] = {
    "sent": 0,
    "delivered": 1,
    "opened": 2,
    "clicked": 3,
    "failed": 4,
}

# Maps status strings to the campaign counter column name
STATUS_COUNTER_MAP: dict[str, str] = {
    "delivered": "total_delivered",
    "opened": "total_opened",
    "clicked": "total_clicked",
    "failed": "total_failed",
}

router = APIRouter()


@router.post("/receipt", status_code=200)
async def receive_receipt(
    body: WebhookReceipt,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """
    Process a delivery receipt callback from the channel stub.

    Idempotency: If the message already has this status (or a later
    status in the delivery lifecycle), the update is silently ignored.

    On valid status transitions:
    1. Updates the message status and corresponding timestamp
    2. Atomically increments the campaign's aggregate counter

    Args:
        body: WebhookReceipt with message_id, status, and timestamp.

    Returns:
        Simple acknowledgement dict.
    """
    message = (
        db.query(Message)
        .filter(Message.id == body.message_id)
        .first()
    )

    if not message:
        logger.warning("Receipt for unknown message_id: %s", body.message_id)
        return {"status": "ignored", "reason": "unknown_message"}

    # --- Idempotency check ---
    current_order = STATUS_ORDER.get(message.status.value, 0)
    incoming_order = STATUS_ORDER.get(body.status, 0)

    # 'failed' is terminal — ignore any further updates on failed messages
    if message.status == MessageStatus.FAILED:
        return {"status": "ignored", "reason": "already_failed"}

    # Ignore if we've already reached this status or a later one
    # (exception: failed can come at any point)
    if body.status != "failed" and incoming_order <= current_order:
        return {"status": "ignored", "reason": "duplicate_or_outdated"}

    # --- Parse callback timestamp ---
    try:
        callback_time = datetime.fromisoformat(body.timestamp)
        if callback_time.tzinfo is None:
            callback_time = callback_time.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        callback_time = datetime.now(timezone.utc)

    # --- Update message status and timestamp ---
    new_status = MessageStatus(body.status)
    message.status = new_status

    if body.status == "delivered":
        message.delivered_at = callback_time
    elif body.status == "opened":
        if not message.delivered_at:
            message.delivered_at = callback_time
        message.opened_at = callback_time
    elif body.status == "clicked":
        if not message.delivered_at:
            message.delivered_at = callback_time
        if not message.opened_at:
            message.opened_at = callback_time
        message.clicked_at = callback_time
    elif body.status == "failed":
        pass  # No timestamp field for failure

    # --- Atomically update campaign counter ---
    counter_field = STATUS_COUNTER_MAP.get(body.status)
    if counter_field and message.campaign_id:
        db.query(Campaign).filter(Campaign.id == message.campaign_id).update(
            {counter_field: getattr(Campaign, counter_field) + 1},
            synchronize_session="evaluate",
        )

    db.commit()

    logger.info(
        "Message %s updated to %s for campaign %s",
        body.message_id,
        body.status,
        message.campaign_id,
    )

    return {"status": "accepted"}
