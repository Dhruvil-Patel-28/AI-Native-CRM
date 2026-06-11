# Glow Studio CRM

An AI-native Mini CRM built for **Glow Studio** — a fictional Indian D2C skincare brand. 

Glow Studio CRM redefines marketing campaign creation by putting AI at the core of the workflow. Instead of forcing marketers to write database queries, configure complex segmentation lists, or manually draft messages, the CRM's autonomous agent and natural language interfaces build campaign parameters on behalf of the user. The marketer remains in absolute control: they prompt their goals, inspect reasoning, preview structured outcomes, and approve before anything goes live.

---

## 🚀 Key Iteration Milestones (Phases)

The CRM is divided into three key capabilities, representing progressive autonomy:

### Phase 1 (V1): Marketer-Guided AI Insights
- **Insight Cards**: The CRM automatically evaluates customer order histories and surfaces 4 proactive, prioritized opportunity cards (e.g., "Max Sunscreen demand in Mumbai", "Win back at-risk serum buyers").
- **Wizard Flow**: Clicking any insight triggers a structured 4-step wizard:
  1. **Intent**: Summarizes the business goal.
  2. **Segment**: Compiles the target audience (AOV, top cities, category filters).
  3. **Message**: Drafts personalized WhatsApp and Email copies.
  4. **Confirm**: Confirms parameters and launches.
- **Results Dashboard**: Displays campaign performance in real-time, processes delivery status webhooks, attributes revenue on click-throughs, and uses Groq to generate a final summary report once all deliveries settle.

### Phase 2 (V2): Natural Language Campaign Wizard
- **NL Entry Point**: Marketers can write arbitrary goals directly into an input box on the dashboard (e.g., *"Re-engage Mumbai sunscreen buyers who bought in March but not April"*).
- **Session-Based Generation**: Groq translates the prompt into structured filters, channel choices, and copy templates, then initializes the 4-step campaign wizard pre-loaded with these settings.
- **Refinement Loop**: The marketer can enter text refinements (e.g., *"give a larger 20% discount instead"* or *"restrict only to Delhi"*), updating the active campaign session dynamically.

### Phase 3 (V3): Autopilot Agent Mode
- **Autonomous Takeover**: The marketer provides a broad, high-level business goal (e.g., *"Increase repeat purchases"* or *"Minimize customer churn"*).
- **Multi-Step Agent reasoning**:
  - **Step 1 (Strategic Analysis)**: Gathers database stats (counts of Loyal, At-Risk, Lapsed, and New customers, AOV, top categories, and campaign click performance history) and decides the target segment, parameters, channel, and target conversion count.
  - **Step 2 (Database Segmentation)**: Queries the database to pull true segment metrics.
  - **Step 3 (Copywriting)**: Crafts contextual campaign templates suited for the selected channel.
  - **Step 4 (Narrative & Risk Formulation)**: Compiles the proposed campaign title, a marketer-facing narrative, risk parameters, and confidence scores.
  - **Step 5 (Financial Forecasting)**: Extracts the estimated conversions via Regex analysis and multiplies it by the segment's Average Order Value (AOV) to calculate the forecasted campaign revenue.
- **Autopilot Review Page**: Displays the agent's chain-of-thought logic (collapsible), targeted customer statistics, channel choices, message templates, risk levels, and forecasted revenue. Marketers can reject the proposal or launch the campaign in one click.

---

## ⚙️ Architecture & Data Flow

```
                                  ┌──────────────────────────────┐
                                  │       React Frontend         │
                                  │ (Vite + TypeScript + Tailwind)│
                                  │            :3000             │
                                  └──────────────┬───────────────┘
                                                 │
                                                 │ HTTP Requests
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │    CRM Backend (FastAPI)     │
                                  │            :8000             │
                                  └──────────────┬───────────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  ▼                              ▼                              ▼
     ┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐
     │      PostgreSQL        │    │         Redis          │    │      Channel Stub      │
     │         :5432          │    │         :6379          │    │    (FastAPI) :8001     │
     ├────────────────────────┤    └────────────────────────┘    ├────────────────────────┤
     │ - customers / orders   │                                  │ - Simulated Delivery   │
     │ - campaigns / messages │                                  │ - Callback Delivery    │
     │ - nl_sessions / runs   │                                  │   Status webhooks      │
     └────────────────────────┘                                  └────────────────────────┘
```

### Campaign Life Cycle (E2E)
1. **Plan Generation**: The AI (Groq `llama-3.3-70b-versatile`) parses an insight or natural language prompt into structured filters and copy templates.
2. **Dynamic Segmentation**: The CRM backend applies these filters directly to the PostgreSQL database using SQL query filters (recency, spending limits, cities, category purchases) to compile the targeted customer IDs.
3. **Async Campaign Dispatch**: Once approved, FastAPI starts a background worker (`BackgroundTasks`) to process the campaign. The API returns a `200/201` status immediately, and the client navigates to the tracking dashboard.
4. **Batch Delivery**: The background dispatcher groups customers into batches of 50 and fires requests concurrently using `asyncio.gather` to the **Channel Stub** simulating message sending.
5. **Real-Time Callbacks**: The Channel Stub processes deliveries asynchronously and delivers webhooks back to the CRM backend (`POST /webhooks/receipt`) simulating real-world response dynamics (e.g., delivered, opened, clicked, failed, including mock duplicate callback retries).
6. **Analytics Attribution**: Upon receipt of a webhook status, the CRM records the delivery metrics. If a message is clicked, the brand's average order value is credited as attributed campaign revenue in real-time.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript (strict), Tailwind CSS 3, Vite 6, React Router DOM v6, Axios
- **Backend**: FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL (psycopg2)
- **Database / Cache**: PostgreSQL 16, Redis 7 (alpine)
- **AI Integration**: Groq SDK (`llama-3.3-70b-versatile` with JSON schema enforcement)
- **Environment**: Docker, Docker Compose

---

## 🚀 Quick Start

Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

### 1. Set Up Environment Variables
Copy the example environment file:
```bash
cp crm-backend/.env.example crm-backend/.env
```
Edit `crm-backend/.env` and insert your **`GROQ_API_KEY`**:
```ini
GROQ_API_KEY=gsk_your_actual_groq_key_here
```

### 2. Launch Services
Run the following command to build and start the database, backend, channel stub, and frontend React app:
```bash
docker compose up --build -d
```
This starts:
- **React Frontend**: `http://localhost:3000`
- **CRM FastAPI Backend**: `http://localhost:8000`
- **Channel Stub Service**: `http://localhost:8001`
- **PostgreSQL Database**: `localhost:5432`
- **Redis Cache**: `localhost:6379`

*Note: On first startup, the database automatically migrates tables and seeds 800 customers, 2000+ orders, 3 completed campaigns, and 4 baseline insights.*

---

## 🧪 Running Automated Tests

A comprehensive integration test suite validates all endpoints, webhook processing, natural language sessions, and autopilot agent flows.

To run tests in a clean database state:
```bash
# Wipe PostgreSQL volumes to reset database, rebuild containers, and execute tests
docker compose down -v && docker compose up -d && sleep 10 && python3 test_all.py
```
This checks 112 validation items:
- Service healthchecks (Backend, Channel Stub, Frontend)
- Insights loading and idempotency
- V1 Wizard Flow previews and confirmation
- Asynchronous callback reception and attributed revenue updates
- CSV customer uploading with duplicate upserting
- V2 Natural Language sessions and refinements
- V3 Autopilot planning, persistence, approval flows, and rejection flows

---

## 📦 API Reference

### 1. Customers
- `GET /customers/stats`: Retreives aggregate statistics (total count, revenue, average order value, top brand categories).
- `POST /customers/upload`: Imports custom CSV sheets of customers and order metrics. Uses upsert logic on email/phone records to prevent duplicate profiles.

### 2. Campaign Wizard & Insights
- `GET /insights`: Generates 4 skincare segment business opportunities.
- `POST /campaigns/preview`: Takes an `insight_id` and optional `refinement_text` to return message copies, target counts, and city/category stats.
- `POST /campaigns/confirm`: Saves a campaign record, maps segments, and kicks off background async dispatch.
- `GET /campaigns`: Lists history of all campaigns.
- `GET /campaigns/{id}/status`: Live dashboard statistics (delivered, opened, clicked, failed, attributed revenue, AI summary report).

### 3. V2: Natural Language Campaign
- `POST /campaigns/nl-preview`: Accepts `nl_input` prompts and optional `session_id` to generate structured wizard previews and refinement modifications.
- `GET /campaigns/nl-session/{session_id}`: Retrieves parameters for active natural language sessions.

### 4. V3: Autopilot Agent
- `POST /autopilot/run`: Accepts a high-level goal, executes the 5-stage Groq agent planning loop, stores details in the DB, and returns the plan.
- `GET /autopilot/{run_id}`: Fetches details of a planned autopilot run.
- `POST /autopilot/{run_id}/approve`: Changes status to approved, launches campaign, and begins message dispatching.
- `POST /autopilot/{run_id}/reject`: Flags the campaign proposal as rejected.

---

## 🧠 Core Engineering Design Decisions

### 1. Robust LLM Sanitization & Fallbacks
Large Language Models are non-deterministic. If Groq encounters rate-limiting or returns malformed JSON structures, the CRM does not break:
- **Try/Except Recovery**: If any step in the Autopilot agent service fails, it immediately triggers local structural fallbacks (`_fallback_step1`, `_fallback_step3`, etc.) to build a valid campaign.
- **Type Checking**: Before returning plans, the service verifies that all lists, dictionaries, strings, and revenue forecasts are correctly typed. Missing fields from the LLM parse are defaulted automatically.

### 2. Webhook Idempotency & Concurrency
Integrating simulated messaging channels mimics the complexity of real networks:
- **Duplicate Callback Rejection**: Real webhooks often deliver duplicate packets. The webhook receipt route uses PostgreSQL transactional locks to discard duplicate message delivery reports, preventing double-counting statistics.
- **Batch Async Firing**: To ensure high performance, message dispatch uses `asyncio.gather` to send batches of 50 HTTP requests concurrently to the Channel Stub.

### 3. Forecast Attribute Logic
- Expected conversions generated by the agent (e.g. `"50-60 orders"`) are extracted using regex pattern matching `\d+` to compute the average conversion target (`55 orders`).
- Attributed revenue is estimated by multiplying this conversion target by the target customer segment's average order value (`expected_conversions * avg_order_value`), providing realistic campaign forecasts.
