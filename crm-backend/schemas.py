"""
Pydantic schemas for request/response validation.

Organized by domain: Customers, Orders, Campaigns, Messages,
AI Insights, and Webhooks. Every API endpoint uses these
schemas for input validation and output serialization.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Customer Schemas
# ---------------------------------------------------------------------------


class CustomerBase(BaseModel):
    """Shared customer fields."""

    name: str
    email: EmailStr
    phone: str
    city: str


class CustomerOut(CustomerBase):
    """Customer returned from API responses."""

    id: UUID
    created_at: datetime
    total_orders: int
    total_spent: float

    model_config = {"from_attributes": True}


class CustomerStats(BaseModel):
    """Aggregate stats shown in the dashboard header."""

    total_customers: int
    total_revenue: float
    campaigns_sent: int
    avg_order_value: float


class UploadResult(BaseModel):
    """Result of a CSV customer upload."""

    customers_imported: int
    orders_imported: int


# ---------------------------------------------------------------------------
# Order Schemas
# ---------------------------------------------------------------------------


class OrderOut(BaseModel):
    """Order returned from API responses."""

    id: UUID
    customer_id: UUID
    amount: float
    product_category: str
    ordered_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# AI Insight Schemas
# ---------------------------------------------------------------------------


class InsightOut(BaseModel):
    """An AI-generated insight card."""

    id: UUID
    insight_type: str
    insight_text: str
    segment_data: dict | None
    priority: int
    created_at: datetime
    is_acted_on: bool
    stat: str | None = None
    potential_revenue: str | None = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Campaign Schemas
# ---------------------------------------------------------------------------


class CampaignPreviewRequest(BaseModel):
    """Request body for POST /campaigns/preview."""

    insight_id: str
    refinement_text: str = ""


class SegmentStats(BaseModel):
    """Statistics about a segment of customers."""

    count: int
    avg_order_value: float
    top_cities: list[str]
    top_products: list[str]
    total_potential_revenue: float


class CampaignPreviewResponse(BaseModel):
    """Response from POST /campaigns/preview."""

    intent_text: str
    segment_params: dict
    whatsapp_message: str
    email_message: str
    channel_recommendation: str
    channel_reason: str
    segment_stats: SegmentStats
    customer_count: int


class CampaignConfirmRequest(BaseModel):
    """Request body for POST /campaigns/confirm."""

    insight_id: str
    campaign_name: str
    message_text: str
    channel: str = Field(pattern=r"^(whatsapp|email)$")
    segment_params: dict


class CampaignConfirmResponse(BaseModel):
    """Response from POST /campaigns/confirm."""

    campaign_id: UUID
    customer_count: int
    status: str


class MessageOut(BaseModel):
    """A message record in a campaign."""

    id: UUID
    campaign_id: UUID
    customer_id: UUID
    message_text: str
    channel: str
    status: str
    sent_at: datetime
    delivered_at: datetime | None = None
    opened_at: datetime | None = None
    clicked_at: datetime | None = None
    customer_name: str | None = None

    model_config = {"from_attributes": True}


class CampaignOut(BaseModel):
    """Campaign returned from API responses."""

    id: UUID
    name: str
    insight_id: UUID | None = None
    segment_query: dict | None = None
    channel: str
    status: str
    created_at: datetime
    total_sent: int
    total_delivered: int
    total_opened: int
    total_clicked: int
    total_failed: int
    revenue_attributed: float
    ai_summary: str | None = None

    model_config = {"from_attributes": True}


class CampaignStatusResponse(BaseModel):
    """Response from GET /campaigns/{id}/status."""

    campaign: CampaignOut
    recent_messages: list[MessageOut]


# ---------------------------------------------------------------------------
# Webhook Schemas
# ---------------------------------------------------------------------------


class WebhookReceipt(BaseModel):
    """Incoming delivery receipt from the channel stub."""

    message_id: str
    status: str = Field(pattern=r"^(delivered|opened|clicked|failed)$")
    timestamp: str


# ---------------------------------------------------------------------------
# Natural Language Campaign Schemas
# ---------------------------------------------------------------------------


class NLPreviewRequest(BaseModel):
    """Request body for POST /campaigns/nl-preview."""

    nl_input: str
    session_id: str | None = None
    refinement_text: str | None = None


class NLPreviewResponse(BaseModel):
    """Response returned for natural language previews and sessions."""

    session_id: UUID
    intent_text: str
    segment_params: dict
    whatsapp_message: str
    email_message: str
    channel_recommendation: str
    channel_reason: str
    segment_stats: SegmentStats
    customer_count: int
    campaign_name: str


# ---------------------------------------------------------------------------
# Autopilot Schemas
# ---------------------------------------------------------------------------


class AutopilotRunRequest(BaseModel):
    """Request body for starting an autopilot agent run."""

    goal: str


class AutopilotSegmentStats(BaseModel):
    """Segment statistics specific to the autopilot plan response."""

    avg_order_value: float
    top_cities: list[str]
    top_products: list[str]
    total_potential_revenue: float


class AutopilotPlanResponse(BaseModel):
    """Response detailing the AI agent's planned campaign."""

    run_id: UUID
    goal: str
    reasoning: str
    segment_params: dict
    customer_count: int
    segment_stats: AutopilotSegmentStats
    channel: str
    message: str
    message_reasoning: str
    plan_title: str
    plan_summary: str
    confidence: str
    risk: str
    expected_revenue: float
    campaign_name: str


