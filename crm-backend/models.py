"""
SQLAlchemy ORM models for Glow Studio CRM.

Defines the five core tables: customers, orders, campaigns,
messages, and ai_insights. All primary keys use UUIDs for
distributed-friendly ID generation.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class ChannelType(str, enum.Enum):
    """Supported delivery channels."""

    WHATSAPP = "whatsapp"
    EMAIL = "email"


class CampaignStatus(str, enum.Enum):
    """Lifecycle states for a campaign."""

    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"


class MessageStatus(str, enum.Enum):
    """Delivery statuses reported by the channel stub."""

    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    FAILED = "failed"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Customer(Base):
    """Represents a Glow Studio customer."""

    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_spent: Mapped[float] = mapped_column(Float, default=0.0)

    orders: Mapped[list["Order"]] = relationship(
        "Order", back_populates="customer", cascade="all, delete-orphan"
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="customer"
    )

    __table_args__ = (
        Index("ix_customers_email", "email"),
        Index("ix_customers_city", "city"),
    )


class Order(Base):
    """A single purchase made by a customer."""

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    product_category: Mapped[str] = mapped_column(String(50), nullable=False)
    ordered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    customer: Mapped["Customer"] = relationship("Customer", back_populates="orders")

    __table_args__ = (
        Index("ix_orders_customer_id", "customer_id"),
        Index("ix_orders_ordered_at", "ordered_at"),
        Index("ix_orders_product_category", "product_category"),
    )


class Campaign(Base):
    """A marketing campaign targeting a customer segment."""

    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    insight_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    segment_query: Mapped[dict] = mapped_column(JSON, nullable=True)
    channel: Mapped[ChannelType] = mapped_column(
        Enum(ChannelType), nullable=False
    )
    status: Mapped[CampaignStatus] = mapped_column(
        Enum(CampaignStatus), default=CampaignStatus.DRAFT
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Aggregate delivery counters
    total_sent: Mapped[int] = mapped_column(Integer, default=0)
    total_delivered: Mapped[int] = mapped_column(Integer, default=0)
    total_opened: Mapped[int] = mapped_column(Integer, default=0)
    total_clicked: Mapped[int] = mapped_column(Integer, default=0)
    total_failed: Mapped[int] = mapped_column(Integer, default=0)
    revenue_attributed: Mapped[float] = mapped_column(Float, default=0.0)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="campaign", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_campaigns_status", "status"),
        Index("ix_campaigns_created_at", "created_at"),
    )


class Message(Base):
    """An individual message sent to a customer within a campaign."""

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False
    )
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[ChannelType] = mapped_column(
        Enum(ChannelType), nullable=False
    )
    status: Mapped[MessageStatus] = mapped_column(
        Enum(MessageStatus), default=MessageStatus.SENT
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    opened_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    clicked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="messages")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="messages")

    __table_args__ = (
        Index("ix_messages_campaign_id", "campaign_id"),
        Index("ix_messages_customer_id", "customer_id"),
        Index("ix_messages_status", "status"),
    )


class AIInsight(Base):
    """An AI-generated actionable insight about the customer base."""

    __tablename__ = "ai_insights"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    insight_type: Mapped[str] = mapped_column(String(50), nullable=False)
    insight_text: Mapped[str] = mapped_column(Text, nullable=False)
    segment_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    is_acted_on: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (
        Index("ix_ai_insights_insight_type", "insight_type"),
        Index("ix_ai_insights_priority", "priority"),
        Index("ix_ai_insights_created_at", "created_at"),
    )


class NLSession(Base):
    """Temporary natural language session storage."""

    __tablename__ = "nl_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nl_input: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

