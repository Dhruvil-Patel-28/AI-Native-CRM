"""
Segment service — dynamic customer segmentation.

Builds SQLAlchemy queries from flexible filter parameters and computes
aggregate statistics over the resulting customer set. Used by campaign
preview and confirm flows to identify target audiences.
"""

from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Customer, Order


def build_segment(segment_params: dict, db: Session) -> list[Customer]:
    """
    Build a customer segment from dynamic filter parameters.

    Supported parameters:
        - days_since_last_order_min (int): Minimum days since last order
        - days_since_last_order_max (int): Maximum days since last order
        - min_orders (int): Minimum total order count
        - max_orders (int): Maximum total order count
        - min_total_spent (float): Minimum total spend
        - max_total_spent (float): Maximum total spend
        - cities (list[str]): Filter by customer city
        - product_categories (list[str]): Filter by purchased product categories

    Args:
        segment_params: Dictionary of optional filter parameters.
        db: Active SQLAlchemy session.

    Returns:
        List of Customer objects matching all provided filters.
    """
    now = datetime.now(timezone.utc)
    query = db.query(Customer)

    # --- Order recency filters ---
    days_min = segment_params.get("days_since_last_order_min")
    days_max = segment_params.get("days_since_last_order_max")

    if days_min is not None or days_max is not None:
        last_order_subquery = (
            db.query(
                Order.customer_id,
                func.max(Order.ordered_at).label("last_order_date"),
            )
            .group_by(Order.customer_id)
            .subquery()
        )

        query = query.join(
            last_order_subquery,
            Customer.id == last_order_subquery.c.customer_id,
        )

        if days_min is not None:
            cutoff_max = now - timedelta(days=days_min)
            query = query.filter(
                last_order_subquery.c.last_order_date <= cutoff_max
            )

        if days_max is not None:
            cutoff_min = now - timedelta(days=days_max)
            query = query.filter(
                last_order_subquery.c.last_order_date >= cutoff_min
            )

    # --- Order count filters ---
    min_orders = segment_params.get("min_orders")
    if min_orders is not None:
        query = query.filter(Customer.total_orders >= min_orders)

    max_orders = segment_params.get("max_orders")
    if max_orders is not None:
        query = query.filter(Customer.total_orders <= max_orders)

    # --- Spend filters ---
    min_spent = segment_params.get("min_total_spent")
    if min_spent is not None:
        query = query.filter(Customer.total_spent >= min_spent)

    max_spent = segment_params.get("max_total_spent")
    if max_spent is not None:
        query = query.filter(Customer.total_spent <= max_spent)

    # --- City filter ---
    cities = segment_params.get("cities")
    if cities:
        query = query.filter(Customer.city.in_(cities))

    # --- Product category filter ---
    product_categories = segment_params.get("product_categories")
    if product_categories:
        category_subquery = (
            db.query(Order.customer_id)
            .filter(Order.product_category.in_(product_categories))
            .distinct()
            .subquery()
        )
        query = query.filter(Customer.id.in_(
            db.query(category_subquery.c.customer_id)
        ))

    return query.all()


def get_segment_stats(customers: list[Customer], db: Session) -> dict:
    """
    Compute aggregate statistics for a segment of customers.

    Args:
        customers: List of Customer objects in the segment.
        db: Active SQLAlchemy session (used for product category lookup).

    Returns:
        Dictionary with count, avg_order_value, top_cities, top_products,
        and total_potential_revenue.
    """
    if not customers:
        return {
            "count": 0,
            "avg_order_value": 0.0,
            "top_cities": [],
            "top_products": [],
            "total_potential_revenue": 0.0,
        }

    customer_ids = [c.id for c in customers]

    # Average order value across the segment
    avg_result = (
        db.query(func.avg(Order.amount))
        .filter(Order.customer_id.in_(customer_ids))
        .scalar()
    )
    avg_order_value = round(float(avg_result or 0), 2)

    # Top cities
    city_counter = Counter(c.city for c in customers)
    top_cities = [city for city, _ in city_counter.most_common(3)]

    # Top product categories purchased by these customers
    product_rows = (
        db.query(Order.product_category, func.count(Order.id).label("cnt"))
        .filter(Order.customer_id.in_(customer_ids))
        .group_by(Order.product_category)
        .order_by(func.count(Order.id).desc())
        .limit(3)
        .all()
    )
    top_products = [row[0] for row in product_rows]

    # Total potential revenue = segment size × avg order value
    total_potential = round(len(customers) * avg_order_value, 2)

    return {
        "count": len(customers),
        "avg_order_value": avg_order_value,
        "top_cities": top_cities,
        "top_products": top_products,
        "total_potential_revenue": total_potential,
    }
