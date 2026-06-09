"""
Campaign service — message personalization and batched delivery.

Handles the campaign firing lifecycle: personalizes message templates
per customer, batches sends to the channel stub in groups of 50, and
tracks delivery via async HTTP calls. Uses httpx.AsyncClient for
non-blocking HTTP and asyncio.gather for concurrent batch sends.
"""

import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from models import Campaign, CampaignStatus, Message, MessageStatus, Order

logger = logging.getLogger(__name__)

CHANNEL_STUB_URL = os.environ.get("CHANNEL_STUB_URL", "http://localhost:8001")
WEBHOOK_BASE_URL = os.environ.get("WEBHOOK_BASE_URL", "http://localhost:8000")
BATCH_SIZE = 50


async def fire_campaign(
    campaign_id: uuid.UUID,
    customers: list,
    message_template: str,
    channel: str,
    db: Session,
) -> None:
    """
    Fire a campaign by personalizing and sending messages to all customers.

    For each customer:
    1. Personalizes the message template with customer data
    2. Creates a Message record with status=sent
    3. POSTs to the channel stub asynchronously

    Messages are batched in groups of 50 for efficient delivery.

    Args:
        campaign_id: UUID of the campaign being fired.
        customers: List of Customer objects to target.
        message_template: Message template with {name} and {last_product} placeholders.
        channel: Delivery channel ('whatsapp' or 'email').
        db: Active SQLAlchemy session.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        logger.error("Campaign %s not found", campaign_id)
        return

    # Prepare all messages
    message_records: list[Message] = []
    send_payloads: list[dict] = []

    for customer in customers:
        # Find customer's most recent product category
        last_order = (
            db.query(Order)
            .filter(Order.customer_id == customer.id)
            .order_by(Order.ordered_at.desc())
            .first()
        )
        last_product = last_order.product_category if last_order else "skincare"

        # Personalize message
        personalized_text = message_template.replace(
            "{name}", customer.name
        ).replace("{last_product}", last_product)

        # Create message record
        message = Message(
            id=uuid.uuid4(),
            campaign_id=campaign_id,
            customer_id=customer.id,
            message_text=personalized_text,
            channel=channel,
            status=MessageStatus.SENT,
            sent_at=datetime.now(timezone.utc),
        )
        message_records.append(message)

        # Prepare payload for channel stub
        send_payloads.append({
            "message_id": str(message.id),
            "customer_name": customer.name,
            "customer_email": customer.email,
            "customer_phone": customer.phone,
            "message_text": personalized_text,
            "channel": channel,
            "callback_url": f"{WEBHOOK_BASE_URL}/webhooks/receipt",
        })

    # Persist all message records
    db.add_all(message_records)
    campaign.total_sent = len(message_records)
    db.commit()

    # Send in batches of 50 using async HTTP
    async with httpx.AsyncClient(timeout=30.0) as client:
        for batch_start in range(0, len(send_payloads), BATCH_SIZE):
            batch = send_payloads[batch_start : batch_start + BATCH_SIZE]
            tasks = [
                _send_to_stub(client, payload) for payload in batch
            ]
            await asyncio.gather(*tasks, return_exceptions=True)

    logger.info(
        "Campaign %s: sent %d messages in %d batches",
        campaign_id,
        len(send_payloads),
        (len(send_payloads) + BATCH_SIZE - 1) // BATCH_SIZE,
    )


async def _send_to_stub(client: httpx.AsyncClient, payload: dict) -> None:
    """
    Send a single message to the channel stub.

    Logs errors but does not raise — a single failed send should not
    abort the entire batch.

    Args:
        client: Active httpx async client.
        payload: Message payload for the channel stub.
    """
    try:
        response = await client.post(f"{CHANNEL_STUB_URL}/send", json=payload)
        if response.status_code != 202:
            logger.warning(
                "Channel stub returned %d for message %s",
                response.status_code,
                payload["message_id"],
            )
    except httpx.HTTPError as e:
        logger.error(
            "Failed to send message %s to channel stub: %s",
            payload["message_id"],
            e,
        )


def mark_campaign_completed(campaign_id: uuid.UUID, db: Session) -> None:
    """
    Mark a campaign as completed once all message statuses have settled.

    Args:
        campaign_id: UUID of the campaign to complete.
        db: Active SQLAlchemy session.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if campaign and campaign.status == CampaignStatus.RUNNING:
        campaign.status = CampaignStatus.COMPLETED
        db.commit()
        logger.info("Campaign %s marked as completed", campaign_id)
