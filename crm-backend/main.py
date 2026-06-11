"""
Glow Studio CRM — FastAPI application entry point.

Configures CORS, registers routers, and creates database tables
on startup. The seed script runs as a separate one-time command.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Glow Studio CRM",
    description="AI-native Mini CRM for an Indian D2C skincare brand",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend
cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register routers
from routers import campaigns, customers, insights, webhooks, autopilot  # noqa: E402

app.include_router(customers.router, prefix="/customers", tags=["Customers"])
app.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])
app.include_router(insights.router, prefix="/insights", tags=["Insights"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
app.include_router(autopilot.router, prefix="/autopilot", tags=["Autopilot"])


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Simple health check endpoint."""
    return {"status": "healthy", "service": "glow-studio-crm"}
