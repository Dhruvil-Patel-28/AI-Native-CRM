# Glow Studio CRM

AI-native Mini CRM for Glow Studio — a fictional Indian D2C skincare brand. AI proactively surfaces insights from customer data, generates campaign plans, and summarizes results. The marketer stays in control: they never build segments manually. AI does the thinking, the marketer approves and refines.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                          │
│                    (Vite + TypeScript + Tailwind)               │
│                         :3000                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CRM Backend (FastAPI)                      │
│   Routers: /insights · /campaigns · /webhooks · /customers     │
│   Services: AI (Groq) · Segment Builder · Campaign Delivery    │
│                         :8000                                   │
├────────────────┬───────────────────────┬────────────────────────┤
│   PostgreSQL   │       Redis           │   Channel Stub         │
│   :5432        │       :6379           │   (FastAPI) :8001      │
│                │                       │                        │
│   customers    │   caching (future)    │   Simulated delivery   │
│   orders       │                       │   Callbacks → webhooks │
│   campaigns    │                       │                        │
│   messages     │                       │                        │
│   ai_insights  │                       │                        │
└────────────────┴───────────────────────┴────────────────────────┘
```

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> && cd glow-studio-crm

# 2. Set up environment variables
cp crm-backend/.env.example crm-backend/.env
# Edit crm-backend/.env and add your GROQ_API_KEY

# 3. Start all services
docker-compose up --build

# 4. Open the app
open http://localhost:3000
```

The CRM backend automatically seeds the database with 800 customers, 2000+ orders, and 3 historical campaigns on first startup.

## Environment Variables

| Variable | Service | Description | Default |
|----------|---------|-------------|---------|
| `DATABASE_URL` | crm-backend | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/glowstudio` |
| `GROQ_API_KEY` | crm-backend | Groq API key for LLM calls | *required* |
| `GROQ_MODEL` | crm-backend | LLM model name | `llama-3.3-70b-versatile` |
| `CHANNEL_STUB_URL` | crm-backend | Channel stub service URL | `http://localhost:8001` |
| `REDIS_URL` | crm-backend | Redis connection string | `redis://localhost:6379` |
| `CORS_ORIGINS` | crm-backend | Allowed CORS origins | `http://localhost:3000` |
| `PORT` | channel-stub | Service port | `8001` |
| `VITE_API_URL` | frontend | CRM backend URL | `http://localhost:8000` |

## API Endpoints

### Insights
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/insights` | Generate AI insights from customer data |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/campaigns/preview` | AI-powered campaign preview |
| `POST` | `/campaigns/confirm` | Confirm and fire campaign |
| `GET` | `/campaigns/{id}/status` | Campaign status with live feed |
| `GET` | `/campaigns` | List all campaigns |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/customers/stats` | Dashboard aggregate stats |
| `POST` | `/customers/upload` | CSV upload with upsert |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhooks/receipt` | Delivery status callbacks |

### Channel Stub
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/send` | Accept message for simulated delivery |

## Design Decisions

### 1. AI as a First-Class Service, Not a Feature
The AI service is a separate module (`ai_service.py`) with three focused functions, each with comprehensive fallback responses. This means the CRM remains fully functional even when the LLM is unavailable — the marketer gets slightly less nuanced insights, but the workflow never breaks. Every Groq call uses `response_format={"type": "json_object"}` for reliable structured output.

### 2. Channel Stub with Realistic Simulation
Rather than mocking delivery in the CRM itself, the channel stub is a standalone service that simulates real-world delivery dynamics: probabilistic success rates, timing delays, and crucially, 10% duplicate callbacks. This forces the CRM's webhook handler to implement proper idempotency — the same pattern needed for real WhatsApp/email integrations.

### 3. Background Task Campaign Firing
Campaigns fire asynchronously via FastAPI's `BackgroundTasks`. The backend returns immediately with the campaign ID, and the frontend polls for status updates. Messages are sent in batches of 50 using `asyncio.gather` for concurrency without overwhelming the channel stub. This mirrors real-world campaign infrastructure where sends happen asynchronously.

### 4. Dynamic Segmentation over Saved Segments
Instead of pre-computed, saved segments that go stale, the segment service builds queries dynamically from filter parameters. This means segments are always computed from current data. The AI generates segment parameters, and the same parameters flow through preview → confirm → execution. The marketer can refine segments in natural language, and the AI adjusts the parameters accordingly.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript (strict), Tailwind CSS 3, Vite 6 |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| AI/LLM | Groq (llama-3.3-70b-versatile) |
| HTTP | httpx (async), axios |
| Infrastructure | Docker Compose |
