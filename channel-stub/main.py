"""
Channel Stub — simulated WhatsApp/Email delivery service.

A standalone FastAPI service that accepts message send requests and
simulates realistic delivery lifecycles in the background. Each message
progresses through delivery → open → click stages with probabilistic
outcomes and realistic timing delays.

This service has NO database — it receives messages via POST /send,
returns 202 Accepted immediately, and fires callbacks to the CRM's
webhook endpoint as delivery events occur.

Runs on port 8001.
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel

from simulator import simulate_delivery

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Glow Studio Channel Stub",
    description=(
        "Simulated WhatsApp/Email delivery service for Glow Studio CRM. "
        "Accepts messages and simulates realistic delivery lifecycles "
        "with probabilistic outcomes and callback notifications."
    ),
    version="1.0.0",
)


class SendRequest(BaseModel):
    """Incoming message payload from the CRM backend."""

    message_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    message_text: str
    channel: str
    callback_url: str


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "channel-stub"}


@app.post("/send", status_code=202)
async def send_message(
    body: SendRequest,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """
    Accept a message for simulated delivery.

    Returns 202 Accepted immediately and triggers background delivery
    simulation. The simulator will POST status callbacks to the
    provided callback_url as the message progresses through its
    delivery lifecycle.
    """
    logger.info(
        "Accepted message %s for %s via %s",
        body.message_id,
        body.customer_name,
        body.channel,
    )

    background_tasks.add_task(
        simulate_delivery,
        {
            "message_id": body.message_id,
            "customer_name": body.customer_name,
            "customer_email": body.customer_email,
            "customer_phone": body.customer_phone,
            "message_text": body.message_text,
            "channel": body.channel,
            "callback_url": body.callback_url,
        },
    )

    return {"status": "accepted", "message_id": body.message_id}
