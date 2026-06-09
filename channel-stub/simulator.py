"""
Delivery simulator — realistic message lifecycle simulation.

Simulates the progression of a message through delivery stages:
  sent → delivered → opened → clicked

Each stage has:
  - A probabilistic gate (not all messages advance)
  - A realistic time delay
  - A callback POST to the CRM's webhook endpoint

Also simulates edge cases:
  - 10% chance of sending duplicate callbacks (tests CRM idempotency)
  - Exponential backoff retry on callback failures (up to 3 retries)
"""

import asyncio
import logging
import random
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

# --- Simulation probabilities ---
DELIVERY_RATE = 0.85      # 85% of messages get delivered
OPEN_RATE = 0.40          # 40% of delivered messages get opened
CLICK_RATE = 0.25         # 25% of opened messages get clicked
DUPLICATE_RATE = 0.10     # 10% chance of sending a duplicate callback

# --- Timing ranges (seconds) ---
DELIVERY_DELAY = (1, 5)   # 1-5 seconds for delivery
OPEN_DELAY = (3, 8)       # 3-8 seconds after delivery for open
CLICK_DELAY = (5, 12)     # 5-12 seconds after open for click

# --- Retry config ---
MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # Exponential backoff: 1s, 2s, 4s


async def simulate_delivery(message_data: dict) -> None:
    """
    Simulate the full delivery lifecycle for a single message.

    Progression:
    1. Wait 1-5s → 85% chance of "delivered", 15% chance of "failed"
    2. If delivered, wait 3-8s → 40% chance of "opened"
    3. If opened, wait 5-12s → 25% chance of "clicked"

    Each status transition triggers a callback POST to the CRM.
    There is a 10% chance of any callback being sent twice to test
    the CRM's idempotency handling.

    Args:
        message_data: Dictionary containing message_id, channel,
                      callback_url, and customer details.
    """
    message_id = message_data["message_id"]
    callback_url = message_data["callback_url"]

    logger.info("Starting simulation for message %s", message_id)

    # --- Step 1: Delivery ---
    delay = random.uniform(*DELIVERY_DELAY)
    await asyncio.sleep(delay)

    if random.random() < DELIVERY_RATE:
        await _send_callback(callback_url, message_id, "delivered")
    else:
        await _send_callback(callback_url, message_id, "failed")
        logger.info("Message %s: failed delivery", message_id)
        return

    # --- Step 2: Open ---
    delay = random.uniform(*OPEN_DELAY)
    await asyncio.sleep(delay)

    if random.random() < OPEN_RATE:
        await _send_callback(callback_url, message_id, "opened")
    else:
        logger.info("Message %s: delivered but not opened", message_id)
        return

    # --- Step 3: Click ---
    delay = random.uniform(*CLICK_DELAY)
    await asyncio.sleep(delay)

    if random.random() < CLICK_RATE:
        await _send_callback(callback_url, message_id, "clicked")
    else:
        logger.info("Message %s: opened but not clicked", message_id)


async def _send_callback(
    callback_url: str,
    message_id: str,
    status: str,
) -> None:
    """
    POST a delivery status callback to the CRM webhook endpoint.

    Includes:
    - Exponential backoff retry (up to 3 attempts: 1s, 2s, 4s delays)
    - 10% chance of sending the callback twice (duplicate simulation)

    Args:
        callback_url: The CRM's webhook receipt URL.
        message_id: UUID string of the message.
        status: One of "delivered", "opened", "clicked", "failed".
    """
    payload = {
        "message_id": message_id,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Send the primary callback
    success = await _post_with_retry(callback_url, payload)

    if success:
        logger.info("Message %s → %s callback sent", message_id, status)
    else:
        logger.error(
            "Message %s → %s callback FAILED after %d retries",
            message_id,
            status,
            MAX_RETRIES,
        )

    # --- Duplicate simulation ---
    if random.random() < DUPLICATE_RATE:
        logger.info("Message %s → %s: sending DUPLICATE callback", message_id, status)
        await _post_with_retry(callback_url, payload)


async def _post_with_retry(url: str, payload: dict) -> bool:
    """
    POST a JSON payload with exponential backoff retry.

    Attempts up to MAX_RETRIES times with delays of 1s, 2s, 4s
    between attempts. Returns True if any attempt succeeds.

    Args:
        url: Target URL for the POST request.
        payload: JSON-serializable dictionary to send.

    Returns:
        True if the callback was successfully delivered, False otherwise.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    return True
                logger.warning(
                    "Callback to %s returned %d (attempt %d/%d)",
                    url,
                    response.status_code,
                    attempt + 1,
                    MAX_RETRIES,
                )
            except httpx.HTTPError as e:
                logger.warning(
                    "Callback to %s failed (attempt %d/%d): %s",
                    url,
                    attempt + 1,
                    MAX_RETRIES,
                    e,
                )

            # Wait before retrying (skip delay on last attempt)
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAYS[attempt])

    return False
