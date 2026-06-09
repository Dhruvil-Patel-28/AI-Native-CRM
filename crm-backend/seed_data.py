"""
Seed data generator for Glow Studio CRM.

Creates 800 customers across four behavioural segments and 2000+ orders
with realistic Indian names, cities, and product distributions. Also
seeds 3 completed historical campaigns with settled delivery data.

Run directly:  python seed_data.py
"""

import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
from models import (
    AIInsight,
    Campaign,
    CampaignStatus,
    ChannelType,
    Customer,
    Message,
    MessageStatus,
    Order,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

INDIAN_FIRST_NAMES: list[str] = [
    "Aarav", "Aditi", "Aisha", "Amit", "Ananya", "Arjun", "Avni", "Bhavna",
    "Chetan", "Deepa", "Diya", "Esha", "Gaurav", "Harini", "Ishaan", "Jaya",
    "Kabir", "Kavya", "Kiran", "Lakshmi", "Manish", "Meera", "Mohit", "Nandini",
    "Neha", "Nikhil", "Nisha", "Pallavi", "Pooja", "Priya", "Rahul", "Rajesh",
    "Ravi", "Ritika", "Rohit", "Sakshi", "Sandeep", "Sanya", "Shreya", "Simran",
    "Sneha", "Sonal", "Srishti", "Tanvi", "Tara", "Varun", "Vidya", "Vikram",
    "Yash", "Zara", "Aditya", "Amrita", "Ankita", "Anushka", "Ayesha", "Bharat",
    "Charvi", "Daksh", "Devika", "Divya", "Gauri", "Harsh", "Isha", "Kriti",
    "Kunal", "Madhuri", "Namita", "Naveen", "Pankaj", "Preeti", "Radhika",
    "Rashi", "Rohan", "Ruhi", "Saanvi", "Sahil", "Shivani", "Smriti", "Swati",
    "Trisha", "Utkarsh", "Vaishnavi", "Vivek", "Yamini", "Anand", "Bhavesh",
    "Chandni", "Dhruv", "Ekta", "Farhan", "Geeta", "Himani", "Ira", "Jyoti",
    "Kartik", "Lavanya", "Manan", "Nayan", "Om", "Paridhi", "Reema", "Sagar",
    "Tanya", "Uma",
]

INDIAN_LAST_NAMES: list[str] = [
    "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Joshi", "Nair",
    "Iyer", "Mehta", "Verma", "Rao", "Desai", "Kapoor", "Bhat", "Menon",
    "Pillai", "Chatterjee", "Mukherjee", "Banerjee", "Agarwal", "Saxena",
    "Malhotra", "Chopra", "Thakur", "Pandey", "Sinha", "Das", "Mishra", "Shah",
    "Kulkarni", "Pawar", "More", "Jadhav", "Patil", "Deshpande", "Kamath",
    "Hegde", "Shetty", "Bose", "Ghosh", "Sen", "Roy", "Chauhan", "Tiwari",
    "Dubey", "Yadav", "Rastogi", "Bhatt", "Goyal",
]

CITIES: list[str] = [
    "Mumbai", "Delhi", "Bangalore", "Pune", "Chennai", "Hyderabad", "Jaipur",
]

PRODUCT_CATEGORIES: list[str] = [
    "Moisturizer", "Serum", "Sunscreen", "Cleanser", "Toner",
]

# City-level weighting gives Mumbai and Delhi more customers
CITY_WEIGHTS: list[int] = [25, 22, 18, 12, 10, 8, 5]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _random_name() -> str:
    """Generate a random Indian full name."""
    return f"{random.choice(INDIAN_FIRST_NAMES)} {random.choice(INDIAN_LAST_NAMES)}"


def _random_city() -> str:
    """Pick a city with weighted distribution."""
    return random.choices(CITIES, weights=CITY_WEIGHTS, k=1)[0]


def _random_phone() -> str:
    """Generate a realistic Indian mobile number."""
    return f"+91{random.randint(7000000000, 9999999999)}"


def _random_email(name: str, index: int) -> str:
    """Generate a unique email from the customer's name."""
    slug = name.lower().replace(" ", ".").replace("'", "")
    return f"{slug}{index}@glowstudio.in"


def _random_amount() -> float:
    """Order amount between ₹500 and ₹5000."""
    return round(random.uniform(500, 5000), 2)


def _now() -> datetime:
    """UTC-aware current timestamp."""
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Segment builders
# ---------------------------------------------------------------------------

def _create_loyal_customer(index: int) -> tuple[Customer, list[Order]]:
    """Loyal segment: 5-10 orders, last order within 30 days."""
    name = _random_name()
    num_orders = random.randint(5, 10)
    orders: list[Order] = []
    total_spent = 0.0
    customer_id = uuid.uuid4()

    for i in range(num_orders):
        if i == num_orders - 1:
            days_ago = random.randint(1, 30)
        else:
            days_ago = random.randint(7, 180)

        amount = _random_amount()
        total_spent += amount
        orders.append(
            Order(
                id=uuid.uuid4(),
                customer_id=customer_id,
                amount=amount,
                product_category=random.choice(PRODUCT_CATEGORIES),
                ordered_at=_now() - timedelta(days=days_ago, hours=random.randint(0, 23)),
            )
        )

    customer = Customer(
        id=customer_id,
        name=name,
        email=_random_email(name, index),
        phone=_random_phone(),
        city=_random_city(),
        created_at=_now() - timedelta(days=random.randint(90, 365)),
        total_orders=num_orders,
        total_spent=round(total_spent, 2),
    )
    return customer, orders


def _create_at_risk_customer(index: int) -> tuple[Customer, list[Order]]:
    """At-risk segment: 2-3 orders, last order 45-60 days ago."""
    name = _random_name()
    num_orders = random.randint(2, 3)
    orders: list[Order] = []
    total_spent = 0.0
    customer_id = uuid.uuid4()

    for i in range(num_orders):
        if i == num_orders - 1:
            days_ago = random.randint(45, 60)
        else:
            days_ago = random.randint(60, 180)

        amount = _random_amount()
        total_spent += amount
        orders.append(
            Order(
                id=uuid.uuid4(),
                customer_id=customer_id,
                amount=amount,
                product_category=random.choice(PRODUCT_CATEGORIES),
                ordered_at=_now() - timedelta(days=days_ago, hours=random.randint(0, 23)),
            )
        )

    customer = Customer(
        id=customer_id,
        name=name,
        email=_random_email(name, index + 200),
        phone=_random_phone(),
        city=_random_city(),
        created_at=_now() - timedelta(days=random.randint(90, 300)),
        total_orders=num_orders,
        total_spent=round(total_spent, 2),
    )
    return customer, orders


def _create_lapsed_customer(index: int) -> tuple[Customer, list[Order]]:
    """Lapsed segment: 1-2 orders, last order 90+ days ago."""
    name = _random_name()
    num_orders = random.randint(1, 2)
    orders: list[Order] = []
    total_spent = 0.0
    customer_id = uuid.uuid4()

    for i in range(num_orders):
        days_ago = random.randint(90, 180)
        amount = _random_amount()
        total_spent += amount
        orders.append(
            Order(
                id=uuid.uuid4(),
                customer_id=customer_id,
                amount=amount,
                product_category=random.choice(PRODUCT_CATEGORIES),
                ordered_at=_now() - timedelta(days=days_ago, hours=random.randint(0, 23)),
            )
        )

    customer = Customer(
        id=customer_id,
        name=name,
        email=_random_email(name, index + 500),
        phone=_random_phone(),
        city=_random_city(),
        created_at=_now() - timedelta(days=random.randint(120, 365)),
        total_orders=num_orders,
        total_spent=round(total_spent, 2),
    )
    return customer, orders


def _create_new_customer(index: int) -> tuple[Customer, list[Order]]:
    """New segment: first order within last 30 days."""
    name = _random_name()
    customer_id = uuid.uuid4()
    days_ago = random.randint(1, 30)
    amount = _random_amount()

    order = Order(
        id=uuid.uuid4(),
        customer_id=customer_id,
        amount=amount,
        product_category=random.choice(PRODUCT_CATEGORIES),
        ordered_at=_now() - timedelta(days=days_ago, hours=random.randint(0, 23)),
    )

    customer = Customer(
        id=customer_id,
        name=name,
        email=_random_email(name, index + 650),
        phone=_random_phone(),
        city=_random_city(),
        created_at=_now() - timedelta(days=days_ago),
        total_orders=1,
        total_spent=round(amount, 2),
    )
    return customer, [order]


# ---------------------------------------------------------------------------
# Historical campaigns
# ---------------------------------------------------------------------------

def _create_historical_campaigns(
    db: Session, customers: list[Customer]
) -> None:
    """Create 3 completed campaigns with realistic settled delivery data."""

    campaign_configs: list[dict] = [
        {
            "name": "Summer Glow Sale — WhatsApp",
            "channel": ChannelType.WHATSAPP,
            "days_ago": 45,
            "target_count": 120,
            "delivery_rate": 0.88,
            "open_rate": 0.42,
            "click_rate": 0.18,
        },
        {
            "name": "Monsoon Skincare Essentials — Email",
            "channel": ChannelType.EMAIL,
            "days_ago": 30,
            "target_count": 200,
            "delivery_rate": 0.92,
            "open_rate": 0.28,
            "click_rate": 0.10,
        },
        {
            "name": "Win-Back: Miss You! — WhatsApp",
            "channel": ChannelType.WHATSAPP,
            "days_ago": 14,
            "target_count": 80,
            "delivery_rate": 0.85,
            "open_rate": 0.38,
            "click_rate": 0.22,
        },
    ]

    for config in campaign_configs:
        target_customers = random.sample(
            customers, min(config["target_count"], len(customers))
        )
        total_sent = len(target_customers)
        total_delivered = int(total_sent * config["delivery_rate"])
        total_opened = int(total_delivered * config["open_rate"])
        total_clicked = int(total_opened * config["click_rate"])
        total_failed = total_sent - total_delivered
        revenue = round(total_clicked * random.uniform(800, 2400), 2)

        campaign_created = _now() - timedelta(days=config["days_ago"])
        campaign = Campaign(
            id=uuid.uuid4(),
            name=config["name"],
            channel=config["channel"],
            status=CampaignStatus.COMPLETED,
            created_at=campaign_created,
            total_sent=total_sent,
            total_delivered=total_delivered,
            total_opened=total_opened,
            total_clicked=total_clicked,
            total_failed=total_failed,
            revenue_attributed=revenue,
            segment_query={},
        )
        db.add(campaign)

        for i, cust in enumerate(target_customers):
            sent_time = campaign_created + timedelta(seconds=random.randint(1, 300))

            if i < total_delivered:
                status = MessageStatus.DELIVERED
                delivered_time = sent_time + timedelta(seconds=random.randint(2, 10))
                opened_time = None
                clicked_time = None

                if i < total_opened:
                    status = MessageStatus.OPENED
                    opened_time = delivered_time + timedelta(
                        seconds=random.randint(60, 3600)
                    )
                    if i < total_clicked:
                        status = MessageStatus.CLICKED
                        clicked_time = opened_time + timedelta(
                            seconds=random.randint(5, 600)
                        )
            elif i < total_sent:
                status = MessageStatus.FAILED
                delivered_time = None
                opened_time = None
                clicked_time = None
            else:
                status = MessageStatus.SENT
                delivered_time = None
                opened_time = None
                clicked_time = None

            message = Message(
                id=uuid.uuid4(),
                campaign_id=campaign.id,
                customer_id=cust.id,
                message_text=f"Hi {cust.name}, check out our latest skincare deals!",
                channel=config["channel"],
                status=status,
                sent_at=sent_time,
                delivered_at=delivered_time,
                opened_at=opened_time,
                clicked_at=clicked_time,
            )
            db.add(message)

    db.flush()


# ---------------------------------------------------------------------------
# Main seeder
# ---------------------------------------------------------------------------

def seed(db: Session) -> dict[str, int]:
    """
    Populate the database with realistic demo data.

    Returns a summary of inserted record counts.
    """
    random.seed(42)  # Reproducible data for demos

    all_customers: list[Customer] = []
    all_orders: list[Order] = []

    # Loyal: 200 customers
    for i in range(200):
        cust, orders = _create_loyal_customer(i)
        all_customers.append(cust)
        all_orders.extend(orders)

    # At-risk: 300 customers
    for i in range(300):
        cust, orders = _create_at_risk_customer(i)
        all_customers.append(cust)
        all_orders.extend(orders)

    # Lapsed: 150 customers
    for i in range(150):
        cust, orders = _create_lapsed_customer(i)
        all_customers.append(cust)
        all_orders.extend(orders)

    # New: 150 customers
    for i in range(150):
        cust, orders = _create_new_customer(i)
        all_customers.append(cust)
        all_orders.extend(orders)

    db.add_all(all_customers)
    db.flush()  # Ensure customer IDs are available for FK references

    db.add_all(all_orders)
    db.flush()

    _create_historical_campaigns(db, all_customers)

    db.commit()

    return {
        "customers": len(all_customers),
        "orders": len(all_orders),
        "campaigns": 3,
    }


def run_seed() -> None:
    """Entry point — creates tables and seeds data."""
    print("🌱 Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(Customer).first()
        if existing:
            print("⚠️  Database already seeded — skipping.")
            return

        print("🌱 Seeding data...")
        summary = seed(db)
        print(f"✅ Seeded: {summary['customers']} customers, "
              f"{summary['orders']} orders, {summary['campaigns']} campaigns")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
