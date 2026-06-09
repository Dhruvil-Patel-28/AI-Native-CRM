"""
AI service — Groq LLM integration for Glow Studio CRM.

Provides three core AI functions:
1. generate_insights — proactive customer insights from DB stats
2. preview_campaign — campaign planning from an insight card
3. summarize_results — post-campaign performance narrative

All calls use Groq's llama-3.3-70b-versatile model with structured
JSON output. Every call includes try/except with meaningful fallbacks
so the CRM remains functional even if the LLM is unavailable.
"""

import json
import logging
import os

from groq import Groq

logger = logging.getLogger(__name__)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


def generate_insights(db_stats: dict) -> list[dict]:
    """
    Generate 4 actionable customer insights from aggregate database stats.

    Args:
        db_stats: Dictionary containing customer counts by segment,
                  average order value, top product, and last campaign metrics.

    Returns:
        List of 4 insight dictionaries, each with insight_type, insight_text,
        segment_data, priority, stat, and potential_revenue fields.
    """
    system_prompt = (
        "You are an AI analyst for Glow Studio, an Indian D2C skincare brand. "
        "Generate exactly 4 customer insights in JSON format. Each insight should "
        "be actionable, specific, and written for a non-technical marketer. "
        "Use Indian Rupees (₹) for all amounts.\n\n"
        "Return this exact JSON structure:\n"
        "{\n"
        '  "insights": [\n'
        "    {\n"
        '      "insight_type": "churn_risk | win_back | high_value | channel_performance | seasonal",\n'
        '      "insight_text": "2-3 line actionable insight text",\n'
        '      "segment_data": { "days_since_last_order_min": 45, "days_since_last_order_max": 90, "min_orders": 2 },\n'
        '      "priority": 1,\n'
        '      "stat": "312 customers",\n'
        '      "potential_revenue": "₹74,880"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- insight_type must be one of: churn_risk, win_back, high_value, channel_performance, seasonal\n"
        "- priority must be 1-4 (1 = highest priority)\n"
        "- Each insight must have unique priority\n"
        "- segment_data must contain valid filter parameters for customer segmentation\n"
        "- stat should be a concise metric (e.g. '312 customers', '₹2,400 avg spend')\n"
        "- potential_revenue should estimate recoverable revenue in ₹"
    )

    user_prompt = (
        f"Here are the current customer stats for Glow Studio:\n\n"
        f"Total Customers: {db_stats['total_customers']}\n"
        f"Loyal Customers (ordered in last 30 days, 5+ orders): {db_stats['loyal_count']}\n"
        f"At-Risk Customers (last order 45-60 days ago): {db_stats['at_risk_count']}\n"
        f"Lapsed Customers (last order 90+ days ago): {db_stats['lapsed_count']}\n"
        f"New Customers (first order in last 30 days): {db_stats['new_count']}\n"
        f"Average Order Value: ₹{db_stats['avg_order_value']:,.0f}\n"
        f"Top Product Category: {db_stats['top_product_category']}\n"
        f"Last Campaign Open Rate: {db_stats.get('last_campaign_open_rate', 'N/A')}\n"
        f"Last Campaign Channel: {db_stats.get('last_campaign_channel', 'N/A')}\n\n"
        "Generate 4 prioritized insights based on this data."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        result = json.loads(response.choices[0].message.content)
        return result.get("insights", [])

    except Exception as e:
        logger.error("Groq API error in generate_insights: %s", e)
        return _fallback_insights(db_stats)


def preview_campaign(insight_data: dict, refinement: str = "") -> dict:
    """
    Generate a campaign preview from an insight card.

    Args:
        insight_data: The insight card data (type, text, segment_data, etc.)
        refinement: Optional natural-language refinement from the marketer.

    Returns:
        Dictionary with intent_text, segment_params, whatsapp_message,
        email_message, channel_recommendation, and channel_reason.
    """
    system_prompt = (
        "You are an AI campaign planner for Glow Studio, an Indian D2C skincare brand. "
        "Generate a campaign preview based on the insight provided. Return JSON only.\n\n"
        "Return this exact JSON structure:\n"
        "{\n"
        '  "intent_text": "You want to re-engage customers who...",\n'
        '  "segment_params": { "days_since_last_order_min": 45, "days_since_last_order_max": 90, "min_orders": 2 },\n'
        '  "whatsapp_message": "Hi {name}, ... Use code XYZ. Shop now: glowstudio.in",\n'
        '  "email_message": "Longer version for email with more detail...",\n'
        '  "channel_recommendation": "whatsapp",\n'
        '  "channel_reason": "Your last WhatsApp campaign had 3x better open rate than email"\n'
        "}\n\n"
        "Rules:\n"
        "- intent_text should be a plain-English summary of campaign intent\n"
        "- segment_params must be valid filter parameters\n"
        "- Messages must include {name} placeholder for personalization\n"
        "- WhatsApp message should be concise (under 200 chars)\n"
        "- Email message should be more detailed (2-3 paragraphs)\n"
        "- channel_recommendation must be 'whatsapp' or 'email'\n"
        "- Use Indian Rupees (₹) for all amounts\n"
        "- Messages should feel warm, personal, and on-brand for a skincare company"
    )

    refinement_text = ""
    if refinement:
        refinement_text = f"\n\nMarketer's refinement request: {refinement}"

    user_prompt = (
        f"Create a campaign based on this insight:\n\n"
        f"Type: {insight_data.get('insight_type', 'general')}\n"
        f"Insight: {insight_data.get('insight_text', '')}\n"
        f"Segment Data: {json.dumps(insight_data.get('segment_data', {}))}\n"
        f"Priority: {insight_data.get('priority', 2)}"
        f"{refinement_text}"
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        logger.error("Groq API error in preview_campaign: %s", e)
        return _fallback_preview(insight_data)


def summarize_results(campaign_stats: dict) -> dict:
    """
    Generate a narrative summary and recommendation from campaign results.

    Args:
        campaign_stats: Dictionary with delivery counts, rates, and revenue.

    Returns:
        Dictionary with summary (narrative paragraph) and recommendation.
    """
    system_prompt = (
        "You are an AI analyst for Glow Studio, an Indian D2C skincare brand. "
        "Summarize campaign results for a non-technical marketer. "
        "Return JSON only.\n\n"
        "Return this exact JSON structure:\n"
        "{\n"
        '  "summary": "Your win-back campaign reached X customers on WhatsApp. '
        'Y messages were delivered, Z were opened (A% open rate)...",\n'
        '  "recommendation": "Consider sending a follow-up to the N customers '
        'who received but didn\'t open..."\n'
        "}\n\n"
        "Rules:\n"
        "- Summary should be 2-3 sentences with specific numbers\n"
        "- Include open rate percentage and compare to averages when available\n"
        "- Recommendation should be a concrete next action\n"
        "- Use Indian Rupees (₹) for all amounts\n"
        "- Tone: insightful, encouraging, data-driven"
    )

    user_prompt = (
        f"Campaign Results:\n\n"
        f"Campaign Name: {campaign_stats.get('name', 'Campaign')}\n"
        f"Channel: {campaign_stats.get('channel', 'whatsapp')}\n"
        f"Total Sent: {campaign_stats.get('total_sent', 0)}\n"
        f"Total Delivered: {campaign_stats.get('total_delivered', 0)}\n"
        f"Total Opened: {campaign_stats.get('total_opened', 0)}\n"
        f"Total Clicked: {campaign_stats.get('total_clicked', 0)}\n"
        f"Total Failed: {campaign_stats.get('total_failed', 0)}\n"
        f"Revenue Attributed: ₹{campaign_stats.get('revenue_attributed', 0):,.0f}\n"
        f"Delivery Rate: {campaign_stats.get('delivery_rate', 0):.1f}%\n"
        f"Open Rate: {campaign_stats.get('open_rate', 0):.1f}%\n"
        f"Click Rate: {campaign_stats.get('click_rate', 0):.1f}%"
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        logger.error("Groq API error in summarize_results: %s", e)
        return _fallback_summary(campaign_stats)


# ---------------------------------------------------------------------------
# Fallback responses — used when Groq API is unavailable
# ---------------------------------------------------------------------------


def _fallback_insights(db_stats: dict) -> list[dict]:
    """Return deterministic insights when LLM is unavailable."""
    at_risk = db_stats.get("at_risk_count", 0)
    lapsed = db_stats.get("lapsed_count", 0)
    loyal = db_stats.get("loyal_count", 0)
    new = db_stats.get("new_count", 0)
    avg_value = db_stats.get("avg_order_value", 0)

    return [
        {
            "insight_type": "churn_risk",
            "insight_text": (
                f"{at_risk} customers haven't ordered in 45-60 days — "
                f"they're in your highest churn risk window. A targeted "
                f"win-back offer could recover significant revenue."
            ),
            "segment_data": {
                "days_since_last_order_min": 45,
                "days_since_last_order_max": 60,
                "min_orders": 2,
            },
            "priority": 1,
            "stat": f"{at_risk} customers",
            "potential_revenue": f"₹{at_risk * avg_value * 0.15:,.0f}",
        },
        {
            "insight_type": "win_back",
            "insight_text": (
                f"{lapsed} customers have gone silent for 90+ days. "
                f"A re-engagement campaign with an exclusive offer "
                f"could bring back 10-15% of them."
            ),
            "segment_data": {
                "days_since_last_order_min": 90,
                "min_orders": 1,
            },
            "priority": 2,
            "stat": f"{lapsed} customers",
            "potential_revenue": f"₹{lapsed * avg_value * 0.12:,.0f}",
        },
        {
            "insight_type": "high_value",
            "insight_text": (
                f"Your {loyal} loyal customers are your strongest asset. "
                f"A VIP reward or early access campaign could increase "
                f"their average order value by 20-30%."
            ),
            "segment_data": {
                "days_since_last_order_max": 30,
                "min_orders": 5,
            },
            "priority": 3,
            "stat": f"{loyal} customers",
            "potential_revenue": f"₹{loyal * avg_value * 0.25:,.0f}",
        },
        {
            "insight_type": "seasonal",
            "insight_text": (
                f"{new} new customers joined in the last 30 days. "
                f"A welcome series with skincare tips and a second-order "
                f"discount could boost early retention."
            ),
            "segment_data": {
                "days_since_last_order_max": 30,
                "max_orders": 1,
            },
            "priority": 4,
            "stat": f"{new} customers",
            "potential_revenue": f"₹{new * avg_value * 0.30:,.0f}",
        },
    ]


def _fallback_preview(insight_data: dict) -> dict:
    """Return a deterministic campaign preview when LLM is unavailable."""
    segment_data = insight_data.get("segment_data", {})
    insight_type = insight_data.get("insight_type", "general")

    return {
        "intent_text": (
            f"You want to target customers based on the '{insight_type}' insight. "
            f"This campaign will reach customers matching the segment criteria "
            f"with a personalized message to drive re-engagement."
        ),
        "segment_params": segment_data,
        "whatsapp_message": (
            "Hi {name}, we miss you at Glow Studio! "
            "It's been a while since your last {last_product} purchase. "
            "Come back with 15% off your next order. "
            "Use code COMEBACK15. Shop now: glowstudio.in"
        ),
        "email_message": (
            "Hi {name},\n\n"
            "We noticed it's been a while since you last shopped with Glow Studio. "
            "We've been working on some amazing new products, and we'd love for "
            "you to see what's new.\n\n"
            "As a special welcome-back offer, here's 15% off your next order. "
            "Just use code COMEBACK15 at checkout.\n\n"
            "Your last favourite was our {last_product} — we think you'll love "
            "what we've added to that range.\n\n"
            "Shop now at glowstudio.in\n\n"
            "With love,\nTeam Glow Studio 💛"
        ),
        "channel_recommendation": "whatsapp",
        "channel_reason": (
            "WhatsApp typically achieves 3x higher open rates than email "
            "for D2C skincare brands in India."
        ),
    }


def _fallback_summary(campaign_stats: dict) -> dict:
    """Return a deterministic summary when LLM is unavailable."""
    total_sent = campaign_stats.get("total_sent", 0)
    total_delivered = campaign_stats.get("total_delivered", 0)
    total_opened = campaign_stats.get("total_opened", 0)
    total_clicked = campaign_stats.get("total_clicked", 0)
    revenue = campaign_stats.get("revenue_attributed", 0)
    channel = campaign_stats.get("channel", "whatsapp")
    open_rate = campaign_stats.get("open_rate", 0)

    not_opened = total_delivered - total_opened

    return {
        "summary": (
            f"Your campaign reached {total_sent} customers on {channel}. "
            f"{total_delivered} messages were delivered, {total_opened} were opened "
            f"({open_rate:.0f}% open rate), and {total_clicked} customers clicked through, "
            f"generating ₹{revenue:,.0f} in attributed revenue."
        ),
        "recommendation": (
            f"Consider sending a follow-up to the {not_opened} customers who received "
            f"but didn't open — a different message angle could recover additional orders."
        ),
    }
