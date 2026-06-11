"""
Autopilot Agent Service — Autonomous multi-step campaign builder.

Contains the reasoning loop that decides target segment, copywriting,
and financial forecasts based on a marketer's high-level goal.
"""

import os
import json
import re
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from groq import Groq

from models import Customer, Order, Campaign, CampaignStatus
from services.segment_service import build_segment, get_segment_stats

logger = logging.getLogger(__name__)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


def _get_agent_context(db: Session) -> dict:
    """Gather current database customer metrics and past campaign history."""
    from datetime import timedelta
    from sqlalchemy import func

    now = datetime.now(timezone.utc)

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

    # New: first order in last 30 days
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

    # Last 3 completed campaigns
    last_3 = (
        db.query(Campaign)
        .filter(Campaign.status == CampaignStatus.COMPLETED)
        .order_by(Campaign.created_at.desc())
        .limit(3)
        .all()
    )
    campaign_history_list = []
    for c in last_3:
        open_rate = round((c.total_opened / c.total_delivered) * 100, 1) if c.total_delivered > 0 else 0.0
        click_rate = round((c.total_clicked / c.total_opened) * 100, 1) if c.total_opened > 0 else 0.0
        campaign_history_list.append(
            f"- Name: {c.name}\n"
            f"  Channel: {c.channel.value}\n"
            f"  Total Sent: {c.total_sent}\n"
            f"  Delivered: {c.total_delivered}\n"
            f"  Open Rate: {open_rate}%\n"
            f"  Click Rate: {click_rate}%\n"
            f"  Revenue Attributed: ₹{c.revenue_attributed:,.0f}"
        )
    campaign_history = "\n".join(campaign_history_list) if campaign_history_list else "No past campaigns."

    return {
        "total_customers": total_customers,
        "loyal_count": loyal_count,
        "at_risk_count": at_risk_count,
        "lapsed_count": lapsed_count,
        "new_count": new_count,
        "avg_order_value": round(float(avg_order_value), 2),
        "top_product_category": top_product_category,
        "campaign_history": campaign_history,
    }


async def run_autopilot(goal: str, db: Session) -> dict:
    """
    Reason, plan, and build a complete campaign from a high-level goal.
    Returns the compiled AutopilotPlan.
    """
    # Gather database stats & campaign history
    context = _get_agent_context(db)

    # -----------------------------------------------------------------------
    # STEP 1: ANALYZE CUSTOMER BASE (Decide Segment & Channel)
    # -----------------------------------------------------------------------
    step1_system = (
        "You are an autonomous marketing agent for Glow Studio, an Indian D2C skincare brand. "
        "A marketer has given you a broad goal. Analyze the customer data and decide the "
        "best campaign strategy. Think step by step. Return JSON only.\n\n"
        "Return this exact JSON structure:\n"
        "{\n"
        '  "reasoning": "The goal is to... The highest opportunity is...",\n'
        '  "target_segment": "loyal | at_risk | lapsed | new",\n'
        '  "segment_params": { "days_since_last_order_min": 45, "min_orders": 2 },\n'
        '  "channel": "whatsapp | email",\n'
        '  "message_type": "win_back_discount | vip_special | welcome_discount",\n'
        '  "expected_open_rate": "30-40%",\n'
        '  "expected_conversions": "40-50 orders"\n'
        "}\n\n"
        "Rules:\n"
        "- target_segment must be one of: loyal, at_risk, lapsed, new\n"
        "- channel must be 'whatsapp' or 'email'\n"
        "- segment_params must contain valid filter parameters matching our schema:\n"
        "  * days_since_last_order_min (int)\n"
        "  * days_since_last_order_max (int)\n"
        "  * min_orders (int)\n"
        "  * max_orders (int)\n"
        "  * min_total_spent (float)\n"
        "  * max_total_spent (float)\n"
        "  * cities (list of strings)\n"
        "  * product_categories (list of strings)\n"
        "- Use Indian Rupees (₹) for all amounts."
    )

    step1_user = (
        f"Goal: {goal}\n\n"
        f"Current customer data:\n"
        f"- Total active customer accounts: {context['total_customers']}\n"
        f"- Loyal customers (5+ orders, active): {context['loyal_count']}\n"
        f"- At-risk customers (45-60 days inactive): {context['at_risk_count']}\n"
        f"- Lapsed customers (90+ days inactive): {context['lapsed_count']}\n"
        f"- New customers (first order <30 days): {context['new_count']}\n\n"
        f"Past Campaign History:\n"
        f"{context['campaign_history']}\n\n"
        f"Brand Average Order Value (AOV): ₹{context['avg_order_value']:,.2f}\n"
        f"Brand Top Category: {context['top_product_category']}"
    )

    try:
        response1 = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": step1_system},
                {"role": "user", "content": step1_user},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        analysis = json.loads(response1.choices[0].message.content)
    except Exception as e:
        logger.error("Groq API error in Autopilot Step 1: %s", e)
        analysis = _fallback_step1(goal, context)

    # Sanitize analysis output
    if not isinstance(analysis, dict):
        analysis = {}
    
    segment_params = analysis.get("segment_params", {})
    if not isinstance(segment_params, dict):
        segment_params = {}
        
    channel = analysis.get("channel", "whatsapp")
    if channel not in ["whatsapp", "email"]:
        channel = "whatsapp"
    analysis["channel"] = channel

    # -----------------------------------------------------------------------
    # STEP 2: BUILD SEGMENT (Calculate size & statistics)
    # -----------------------------------------------------------------------
    customers = build_segment(segment_params, db)
    segment_stats = get_segment_stats(customers, db)
    customer_count = segment_stats["count"]

    # -----------------------------------------------------------------------
    # STEP 3: CRAFT CAMPAIGN MESSAGE (Copywriter Agent)
    # -----------------------------------------------------------------------
    step3_system = (
        "You are a copywriter for Glow Studio, an Indian D2C skincare brand. "
        "Write a personalized campaign message targeting the selected customer segment. "
        "Return JSON only.\n\n"
        "Return this exact JSON structure:\n"
        "{\n"
        '  "message": "Hi {name}, ...",\n'
        '  "message_reasoning": "Reason for style, tone, emoji usage..."\n'
        "}\n\n"
        "The message must:\n"
        "- Start with Hi {name}\n"
        "- Reference their relationship with the brand or favorite product categories\n"
        "- Include a clear offer or call to action\n"
        "- Feel warm and personal, not corporate\n"
        "- If WhatsApp, be under 160 characters\n"
        "- If Email, be a friendly 2-3 paragraph note\n"
        "- Use Indian Rupees (₹) for all amounts."
    )

    segment_description = f"{analysis.get('target_segment', 'at_risk')} segment ({customer_count} customers)"
    step3_user = (
        f"Targeting Segment: {segment_description}\n"
        f"Channel: {channel}\n"
        f"Campaign Type: {analysis.get('message_type', 'win_back_discount')}\n"
        f"Segment Top Product Categories: {', '.join(segment_stats['top_products'])}\n"
        f"Segment Top Cities: {', '.join(segment_stats['top_cities'])}"
    )

    try:
        response2 = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": step3_system},
                {"role": "user", "content": step3_user},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        copywriting = json.loads(response2.choices[0].message.content)
    except Exception as e:
        logger.error("Groq API error in Autopilot Step 3: %s", e)
        copywriting = _fallback_step3(analysis, segment_stats)

    # Sanitize copywriting output
    if not isinstance(copywriting, dict):
        copywriting = {}
    if "message" not in copywriting or not copywriting["message"]:
        copywriting["message"] = f"Hi {{name}}, treat yourself to our skincare range with 15% off. Use code GLOW15. glowstudio.in"
    if "message_reasoning" not in copywriting:
        copywriting["message_reasoning"] = "A short friendly reminder targeting their favorite skin routine category with an exclusive discount."

    # -----------------------------------------------------------------------
    # STEP 4: BUILD MARKETING PLAN NARRATIVE (Review Plan Builder)
    # -----------------------------------------------------------------------
    step4_system = (
        "You are an AI marketing agent. Based on the analysis and campaign copy you've built, "
        "write a clear summary of what you are proposing and why. "
        "Write it directly to the marketer in second person. "
        "Be specific about numbers and expected outcomes. Return JSON only.\n\n"
        "Return this exact JSON structure:\n"
        "{\n"
        '  "plan_title": "VIP Loyalty Drive | Sunscreen Special...",\n'
        '  "plan_summary": "I analyzed your customer base and identified N customers...",\n'
        '  "confidence": "high | medium | low",\n'
        '  "risk": "low | medium | high"\n'
        "}\n\n"
        "Rules:\n"
        "- plan_summary should explain target segment size, why the channel was chosen, "
        "and details about estimated conversion outcomes."
    )

    step4_user = (
        f"Original Goal: {goal}\n"
        f"Analysis Outcomes: {json.dumps(analysis)}\n"
        f"Generated Copy: {json.dumps(copywriting)}\n"
        f"Actual Customer Count: {customer_count}\n"
        f"Segment Average Order Value: ₹{segment_stats['avg_order_value']}"
    )

    try:
        response3 = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": step4_system},
                {"role": "user", "content": step4_user},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        narrative = json.loads(response3.choices[0].message.content)
    except Exception as e:
        logger.error("Groq API error in Autopilot Step 4: %s", e)
        narrative = _fallback_step4(goal, analysis, customer_count, segment_stats)

    # Sanitize narrative output
    if not isinstance(narrative, dict):
        narrative = {}
    
    plan_title = narrative.get("plan_title", "Autopilot Campaign Plan")
    plan_summary = narrative.get("plan_summary", f"Campaign plan to engage {customer_count} customers on {channel} for goal: {goal}")
    confidence = narrative.get("confidence", "high")
    if confidence not in ["high", "medium", "low"]:
        confidence = "medium"
    risk = narrative.get("risk", "low")
    if risk not in ["high", "medium", "low"]:
        risk = "low"

    # -----------------------------------------------------------------------
    # STEP 5: FORECAST & ASSEMBLE PLAN
    # -----------------------------------------------------------------------
    # Parse expected conversions to calculate estimated revenue
    expected_conversions_str = analysis.get("expected_conversions", "")
    numbers = [float(x) for x in re.findall(r"\d+", str(expected_conversions_str))]
    estimated_orders = sum(numbers) / len(numbers) if numbers else 10.0
    expected_revenue = round(estimated_orders * segment_stats["avg_order_value"], 2)

    campaign_name = f"Autopilot: {plan_title} — {datetime.now().strftime('%b %d')}"

    return {
        "run_id": str(uuid.uuid4()),
        "goal": goal,
        "reasoning": str(analysis.get("reasoning", "")),
        "segment_params": segment_params,
        "customer_count": customer_count,
        "segment_stats": {
            "avg_order_value": segment_stats["avg_order_value"],
            "top_cities": segment_stats["top_cities"],
            "top_products": segment_stats["top_products"],
            "total_potential_revenue": segment_stats["total_potential_revenue"],
        },
        "channel": channel,
        "message": copywriting["message"],
        "message_reasoning": copywriting["message_reasoning"],
        "plan_title": plan_title,
        "plan_summary": plan_summary,
        "confidence": confidence,
        "risk": risk,
        "expected_revenue": expected_revenue,
        "campaign_name": campaign_name,
    }


# ---------------------------------------------------------------------------
# Autopilot LLM Fallback responses
# ---------------------------------------------------------------------------


def _fallback_step1(goal: str, context: dict) -> dict:
    """Fallback plan configuration for Step 1."""
    g = goal.lower()
    if any(x in g for x in ["churn", "lapsed", "re-engage", "win"]):
        return {
            "reasoning": (
                "The goal is win-back. The at_risk segment is prime for re-engagement. "
                "WhatsApp has shown 3x higher response than email historically."
            ),
            "target_segment": "at_risk",
            "segment_params": {
                "days_since_last_order_min": 45,
                "days_since_last_order_max": 90,
                "min_orders": 1,
            },
            "channel": "whatsapp",
            "message_type": "win_back_discount",
            "expected_open_rate": "35-42%",
            "expected_conversions": "40-50 orders",
        }
    elif any(x in g for x in ["loyal", "repeat", "vip", "aov"]):
        return {
            "reasoning": (
                "To drive higher repeat values, we target our active Loyal segment "
                "with an exclusive VIP message. Email is preferred for detailed copy."
            ),
            "target_segment": "loyal",
            "segment_params": {
                "days_since_last_order_max": 30,
                "min_orders": 4,
            },
            "channel": "email",
            "message_type": "vip_special",
            "expected_open_rate": "22-28%",
            "expected_conversions": "20-30 orders",
        }
    else:
        return {
            "reasoning": (
                "Targeting new customers with a welcoming discount on WhatsApp "
                "to encourage their second purchase."
            ),
            "target_segment": "new",
            "segment_params": {
                "days_since_last_order_max": 30,
                "max_orders": 1,
            },
            "channel": "whatsapp",
            "message_type": "welcome_discount",
            "expected_open_rate": "45-50%",
            "expected_conversions": "50-65 orders",
        }


def _fallback_step3(analysis: dict, segment_stats: dict) -> dict:
    """Fallback copywriting for Step 3."""
    channel = analysis.get("channel", "whatsapp")
    segment = analysis.get("target_segment", "at_risk")
    fav_cat = segment_stats["top_products"][0] if segment_stats["top_products"] else "skincare products"

    if channel == "whatsapp":
        return {
            "message": f"Hi {{name}}, we miss you! 🌿 Treat yourself to your favourite {fav_cat} range with 15% off. Use code GLOW15. glowstudio.in",
            "message_reasoning": "Short, warm copy highlighting a discount code with a direct call to action.",
        }
    else:
        return {
            "message": (
                "Hi {name},\n\n"
                f"We noticed it's been a while since your last purchase. We hope you are enjoying your "
                f"favorite skincare routines!\n\n"
                f"To make your return special, here is an exclusive 15% discount on all our collections. "
                f"Use code GLOW15 at checkout.\n\n"
                "Shop now at: glowstudio.in\n\n"
                "Warmly,\nTeam Glow Studio"
            ),
            "message_reasoning": "A polite, personalized email offering support and an exclusive welcome back code.",
        }


def _fallback_step4(goal: str, analysis: dict, customer_count: int, segment_stats: dict) -> dict:
    """Fallback summary narrative for Step 4."""
    segment = analysis.get("target_segment", "at_risk")
    channel = analysis.get("channel", "whatsapp")
    orders_range = analysis.get("expected_conversions", "30-40 orders")
    aov = segment_stats["avg_order_value"]

    return {
        "plan_title": f"Autopilot Campaign: {segment.capitalize()} Re-Engagement",
        "plan_summary": (
            f"I analyzed your customer database for the goal '{goal}' and decided to target the '{segment}' "
            f"segment of {customer_count} customers using {channel}. Historically, this segment conversions range from "
            f"{orders_range}. Proposing a friendly promotion using code GLOW15, expecting to generate "
            f"significant repeat sales at an average order value of ₹{aov:,.0f}."
        ),
        "confidence": "high",
        "risk": "low",
    }
