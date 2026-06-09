"""
Customer routes — CSV upload and aggregate statistics.

Handles customer data ingestion via CSV files with upsert logic
(matching on email) and exposes dashboard-level aggregate metrics.
"""

import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Campaign, CampaignStatus, Customer, Order
from schemas import CustomerStats, UploadResult

router = APIRouter()

VALID_PRODUCT_CATEGORIES = {"Moisturizer", "Serum", "Sunscreen", "Cleanser", "Toner"}


@router.get("/stats", response_model=CustomerStats)
async def get_customer_stats(
    db: Session = Depends(get_db),
) -> CustomerStats:
    """
    Return aggregate stats for the dashboard header.

    Computes total customers, total revenue, completed campaigns count,
    and average order value from the database in real time.
    """
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    total_revenue = db.query(func.coalesce(func.sum(Customer.total_spent), 0)).scalar()
    campaigns_sent = (
        db.query(func.count(Campaign.id))
        .filter(Campaign.status.in_([CampaignStatus.COMPLETED, CampaignStatus.RUNNING]))
        .scalar()
        or 0
    )
    avg_order_value = db.query(func.avg(Order.amount)).scalar() or 0.0

    return CustomerStats(
        total_customers=total_customers,
        total_revenue=round(float(total_revenue), 2),
        campaigns_sent=campaigns_sent,
        avg_order_value=round(float(avg_order_value), 2),
    )


@router.post("/upload", response_model=UploadResult, status_code=201)
async def upload_customers(
    file: UploadFile,
    db: Session = Depends(get_db),
) -> UploadResult:
    """
    Import customers and orders from a CSV file.

    Expected CSV columns: name, email, phone, city, order_date, amount,
    product_category.

    Upsert logic: if a customer with the same email already exists,
    their profile is updated and new orders are appended. The
    total_orders and total_spent counters are recalculated.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded.")

    reader = csv.DictReader(io.StringIO(text))
    required_columns = {"name", "email", "phone", "city", "order_date", "amount", "product_category"}
    if not required_columns.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=422,
            detail=f"CSV must contain columns: {', '.join(sorted(required_columns))}",
        )

    customers_imported = 0
    orders_imported = 0
    seen_emails: dict[str, Customer] = {}

    for row_num, row in enumerate(reader, start=2):
        # --- Validate row ---
        email = row.get("email", "").strip().lower()
        if not email:
            continue

        name = row.get("name", "").strip()
        phone = row.get("phone", "").strip()
        city = row.get("city", "").strip()
        product_category = row.get("product_category", "").strip()
        amount_str = row.get("amount", "").strip()
        order_date_str = row.get("order_date", "").strip()

        if not all([name, phone, city, product_category, amount_str, order_date_str]):
            continue

        if product_category not in VALID_PRODUCT_CATEGORIES:
            continue

        try:
            amount = float(amount_str)
        except ValueError:
            continue

        try:
            order_date = datetime.fromisoformat(order_date_str)
            if order_date.tzinfo is None:
                order_date = order_date.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

        # --- Upsert customer ---
        if email in seen_emails:
            customer = seen_emails[email]
        else:
            customer = db.query(Customer).filter(Customer.email == email).first()

        if customer:
            customer.name = name
            customer.phone = phone
            customer.city = city
        else:
            customer = Customer(
                id=uuid.uuid4(),
                name=name,
                email=email,
                phone=phone,
                city=city,
                created_at=datetime.now(timezone.utc),
                total_orders=0,
                total_spent=0.0,
            )
            db.add(customer)
            db.flush()
            customers_imported += 1

        seen_emails[email] = customer

        # --- Create order ---
        order = Order(
            id=uuid.uuid4(),
            customer_id=customer.id,
            amount=amount,
            product_category=product_category,
            ordered_at=order_date,
        )
        db.add(order)
        orders_imported += 1

    # --- Recalculate aggregates for all touched customers ---
    for customer in seen_emails.values():
        order_stats = (
            db.query(
                func.count(Order.id).label("count"),
                func.coalesce(func.sum(Order.amount), 0).label("total"),
            )
            .filter(Order.customer_id == customer.id)
            .first()
        )
        customer.total_orders = order_stats.count if order_stats else 0
        customer.total_spent = round(float(order_stats.total), 2) if order_stats else 0.0

    db.commit()

    return UploadResult(
        customers_imported=customers_imported,
        orders_imported=orders_imported,
    )
