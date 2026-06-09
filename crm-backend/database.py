"""
Database configuration and session management.

Provides the SQLAlchemy engine, session factory, and Base class
used across the application. Connection URL is loaded from the
DATABASE_URL environment variable.
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/glowstudio",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db():
    """FastAPI dependency that yields a database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
