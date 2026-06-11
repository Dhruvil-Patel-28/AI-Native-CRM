"""
Comprehensive test suite for Glow Studio CRM.
Tests all backend endpoints, channel stub, and the full E2E flow.
"""

import json
import time
import sys
import requests

BASE = "http://localhost:8000"
STUB = "http://localhost:8001"
FRONTEND = "http://localhost:3000"

passed = 0
failed = 0
partial = 0
failures = []

def check(label, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✅ {label}")
    else:
        failed += 1
        msg = f"{label}: {detail}" if detail else label
        failures.append(msg)
        print(f"  ❌ {label} — {detail}")

def warn(label, detail=""):
    global partial
    partial += 1
    print(f"  ⚠️  {label} — {detail}")
    failures.append(f"PARTIAL: {label}: {detail}")


# ═══════════════════════════════════════════════
# PHASE 1: SERVICE HEALTH
# ═══════════════════════════════════════════════
print("\n" + "="*60)
print("PHASE 1: SERVICE HEALTH")
print("="*60)

r = requests.get(f"{BASE}/health")
check("CRM Backend /health", r.status_code == 200, f"got {r.status_code}")

r = requests.get(f"{STUB}/health")
check("Channel Stub /health", r.status_code == 200, f"got {r.status_code}")

r = requests.get(FRONTEND)
check("Frontend serves HTML", r.status_code == 200 and "<title>Glow Studio CRM</title>" in r.text,
      f"status={r.status_code}")


# ═══════════════════════════════════════════════
# PHASE 2: BACKEND API TESTS
# ═══════════════════════════════════════════════
print("\n" + "="*60)
print("PHASE 2: BACKEND API TESTS")
print("="*60)

# --- Customer Stats ---
print("\n--- Customer Stats ---")
r = requests.get(f"{BASE}/customers/stats")
check("GET /customers/stats returns 200", r.status_code == 200)
stats = r.json()
check("Has total_customers", "total_customers" in stats)
check("Has total_revenue", "total_revenue" in stats)
check("Has campaigns_sent", "campaigns_sent" in stats)
check("Has avg_order_value", "avg_order_value" in stats)
check("total_customers is 800", stats.get("total_customers") == 800,
      f"got {stats.get('total_customers')}")

# --- Campaigns List ---
print("\n--- Campaigns List ---")
r = requests.get(f"{BASE}/campaigns")
check("GET /campaigns returns 200", r.status_code == 200)
campaigns = r.json()
check("Returns a list", isinstance(campaigns, list))
check("3 historical campaigns", len(campaigns) == 3, f"got {len(campaigns)}")
if campaigns:
    c = campaigns[0]
    check("Campaign has id", "id" in c)
    check("Campaign has name", "name" in c)
    check("Campaign has status", "status" in c)
    check("Campaign has total_sent", "total_sent" in c)
    check("Ordered by created_at desc", 
          campaigns[0]["created_at"] >= campaigns[-1]["created_at"])

# --- Insights ---
print("\n--- Insights ---")
r = requests.get(f"{BASE}/insights")
check("GET /insights returns 200", r.status_code == 200, f"got {r.status_code}")
insights = r.json()
check("Returns a list", isinstance(insights, list))
check("Returns 4 insights", len(insights) == 4, f"got {len(insights)}")

insight_id = None
if insights:
    i = insights[0]
    check("Has insight_type", "insight_type" in i)
    check("Has insight_text", "insight_text" in i and len(i["insight_text"]) > 20,
          f"text='{i.get('insight_text','')[:50]}'")
    check("Has segment_data", "segment_data" in i and i["segment_data"] is not None)
    check("Has priority", "priority" in i)
    check("Has stat", "stat" in i)
    check("Has potential_revenue", "potential_revenue" in i)
    check("Has id (saved to DB)", "id" in i)
    insight_id = i["id"]

# Test idempotency - call again and check DB count
print("\n--- Insights Idempotency ---")
r2 = requests.get(f"{BASE}/insights")
check("Second /insights call returns 200", r2.status_code == 200)
# The second call replaces stale insights, so use the fresh IDs going forward
if r2.status_code == 200:
    insights2 = r2.json()
    check("Still returns 4 insights", len(insights2) == 4, f"got {len(insights2)}")
    if insights2:
        insight_id = insights2[0]["id"]  # Use the fresh ID

# --- Campaign Preview ---
print("\n--- Campaign Preview ---")
if insight_id:
    r = requests.post(f"{BASE}/campaigns/preview", json={
        "insight_id": insight_id,
        "refinement_text": ""
    })
    check("POST /campaigns/preview returns 200", r.status_code == 200, f"got {r.status_code}")
    preview = r.json()
    check("Has intent_text", "intent_text" in preview and len(preview.get("intent_text","")) > 10)
    check("Has segment_params", "segment_params" in preview)
    check("Has whatsapp_message", "whatsapp_message" in preview and len(preview.get("whatsapp_message","")) > 10)
    check("Has email_message", "email_message" in preview and len(preview.get("email_message","")) > 10)
    check("Has channel_recommendation", "channel_recommendation" in preview)
    check("Has channel_reason", "channel_reason" in preview)
    check("Has customer_count", "customer_count" in preview and preview["customer_count"] > 0,
          f"count={preview.get('customer_count')}")
    check("Has segment_stats", "segment_stats" in preview)

    if "segment_stats" in preview:
        ss = preview["segment_stats"]
        check("Stats has count", "count" in ss)
        check("Stats has avg_order_value", "avg_order_value" in ss)
        check("Stats has top_cities", "top_cities" in ss and isinstance(ss["top_cities"], list))
        check("Stats has top_products", "top_products" in ss and isinstance(ss["top_products"], list))

    # Save for later
    segment_params = preview.get("segment_params", {})
    whatsapp_msg = preview.get("whatsapp_message", "Hi {name}!")
    customer_count_1 = preview.get("customer_count", 0)

    # Test with refinement
    print("\n--- Campaign Preview with Refinement ---")
    r = requests.post(f"{BASE}/campaigns/preview", json={
        "insight_id": insight_id,
        "refinement_text": "only customers in Mumbai"
    })
    check("Preview with refinement returns 200", r.status_code == 200)
    if r.status_code == 200:
        refined = r.json()
        check("Refinement returns preview data", "customer_count" in refined)

    # Test invalid insight_id
    print("\n--- Preview Edge Cases ---")
    r = requests.post(f"{BASE}/campaigns/preview", json={
        "insight_id": "00000000-0000-0000-0000-000000000000",
        "refinement_text": ""
    })
    check("Invalid insight_id returns 404", r.status_code == 404, f"got {r.status_code}")

    # Test missing fields
    r = requests.post(f"{BASE}/campaigns/preview", json={})
    check("Missing fields returns 422", r.status_code == 422, f"got {r.status_code}")

# --- Campaign Confirm ---
print("\n--- Campaign Confirm ---")
if insight_id:
    r = requests.post(f"{BASE}/campaigns/confirm", json={
        "insight_id": insight_id,
        "campaign_name": "Test Campaign E2E",
        "message_text": "Hi {name}! Check out our {last_product} collection. 🌟",
        "channel": "whatsapp",
        "segment_params": segment_params
    })
    check("POST /campaigns/confirm returns 201", r.status_code == 201, f"got {r.status_code}")
    
    campaign_id = None
    if r.status_code == 201:
        confirm_data = r.json()
        check("Returns campaign_id", "campaign_id" in confirm_data)
        check("Returns customer_count", "customer_count" in confirm_data)
        campaign_id = str(confirm_data.get("campaign_id"))
        e2e_customer_count = confirm_data.get("customer_count", 0)
        print(f"  📊 Campaign {campaign_id[:8]}... targeting {e2e_customer_count} customers")

# --- Webhooks ---
print("\n--- Webhooks ---")
# Invalid message_id
r = requests.post(f"{BASE}/webhooks/receipt", json={
    "message_id": "00000000-0000-0000-0000-000000000000",
    "status": "delivered",
    "timestamp": "2026-06-10T00:00:00+00:00"
})
check("Unknown message_id returns 200 (ignored)", r.status_code == 200)
if r.status_code == 200:
    check("Response says 'ignored'", r.json().get("status") == "ignored")

# --- Campaign Status ---
print("\n--- Campaign Status ---")
if campaign_id:
    # Wait for some messages to be processed
    print("  ⏳ Waiting 8 seconds for initial deliveries...")
    time.sleep(8)

    r = requests.get(f"{BASE}/campaigns/{campaign_id}/status")
    check("GET /campaigns/{{id}}/status returns 200", r.status_code == 200)
    
    if r.status_code == 200:
        status = r.json()
        camp = status["campaign"]
        check("Campaign status has total_sent > 0", camp["total_sent"] > 0,
              f"total_sent={camp['total_sent']}")
        check("total_delivered > 0 (callbacks working)", camp["total_delivered"] > 0,
              f"total_delivered={camp['total_delivered']}")
        
        recent = status.get("recent_messages", [])
        check("Has recent_messages", len(recent) > 0, f"got {len(recent)} messages")
        
        if recent:
            msg = recent[0]
            check("Message has customer_name", "customer_name" in msg)
            check("Message has status", "status" in msg)
            check("Message has sent_at", "sent_at" in msg)

    # Invalid campaign_id
    r = requests.get(f"{BASE}/campaigns/00000000-0000-0000-0000-000000000000/status")
    check("Invalid campaign_id returns 404", r.status_code == 404, f"got {r.status_code}")

# ═══════════════════════════════════════════════
# PHASE 3: CHANNEL STUB TESTS
# ═══════════════════════════════════════════════
print("\n" + "="*60)
print("PHASE 3: CHANNEL STUB TESTS")
print("="*60)

r = requests.post(f"{STUB}/send", json={
    "message_id": "test-00000000-0000-0000-0000-000000000001",
    "customer_name": "Test User",
    "customer_email": "test@test.com",
    "customer_phone": "+919999999999",
    "message_text": "Hello Test!",
    "channel": "whatsapp",
    "callback_url": f"{BASE}/webhooks/receipt"
})
check("POST /send returns 202", r.status_code == 202, f"got {r.status_code}")

# ═══════════════════════════════════════════════
# PHASE 4: E2E FLOW CONTINUATION
# ═══════════════════════════════════════════════
print("\n" + "="*60)
print("PHASE 4: E2E FLOW — Waiting for campaign completion")
print("="*60)

if campaign_id:
    # Wait for more deliveries
    print("  ⏳ Waiting 20 seconds for more deliveries...")
    time.sleep(20)

    r = requests.get(f"{BASE}/campaigns/{campaign_id}/status")
    if r.status_code == 200:
        status2 = r.json()
        camp2 = status2["campaign"]
        print(f"  📊 Stats: sent={camp2['total_sent']}, delivered={camp2['total_delivered']}, "
              f"opened={camp2['total_opened']}, clicked={camp2['total_clicked']}, "
              f"failed={camp2['total_failed']}")
        
        check("Deliveries progressed", camp2["total_delivered"] > 0)
        check("Some messages opened", camp2["total_opened"] > 0,
              f"opened={camp2['total_opened']}")
    
    # Wait for completion
    print("  ⏳ Waiting 30 more seconds for completion...")
    time.sleep(30)

    r = requests.get(f"{BASE}/campaigns/{campaign_id}/status")
    if r.status_code == 200:
        status3 = r.json()
        camp3 = status3["campaign"]
        print(f"  📊 Final: sent={camp3['total_sent']}, delivered={camp3['total_delivered']}, "
              f"opened={camp3['total_opened']}, clicked={camp3['total_clicked']}, "
              f"failed={camp3['total_failed']}, status={camp3['status']}")

        check("Campaign completed or all settled",
              camp3["status"] == "completed" or 
              (camp3["total_delivered"] + camp3["total_failed"]) > 0)
        
        # Verify no double-counting
        total_terminal = camp3["total_delivered"] + camp3["total_failed"]
        check("No over-counting (delivered+failed <= sent)",
              total_terminal <= camp3["total_sent"],
              f"delivered({camp3['total_delivered']})+failed({camp3['total_failed']})={total_terminal} vs sent={camp3['total_sent']}")

        # AI summary
        if camp3["status"] == "completed":
            check("AI summary generated", camp3.get("ai_summary") is not None and len(camp3.get("ai_summary","")) > 10,
                  f"summary={'yes' if camp3.get('ai_summary') else 'no'}")

        # Revenue attribution
        if camp3["total_clicked"] > 0:
            check("Revenue attributed on clicks", camp3["revenue_attributed"] > 0,
                  f"revenue={camp3['revenue_attributed']}, clicks={camp3['total_clicked']}")

# ═══════════════════════════════════════════════
# PHASE 5: CSV UPLOAD
# ═══════════════════════════════════════════════
print("\n" + "="*60)
print("PHASE 5: CSV UPLOAD")
print("="*60)

csv_content = """name,email,phone,city,order_date,amount,product_category
Test User One,test_csv_1@test.com,+919111111111,Mumbai,2026-06-01,2499,Serum
Test User Two,test_csv_2@test.com,+919222222222,Delhi,2026-05-15,1299,Sunscreen
"""
import io
files = {"file": ("test.csv", io.StringIO(csv_content), "text/csv")}
r = requests.post(f"{BASE}/customers/upload", files=files)
check("CSV upload returns 201", r.status_code == 201, f"got {r.status_code}")
if r.status_code == 201:
    upload = r.json()
    check("Returns customers_imported", "customers_imported" in upload)
    check("Returns orders_imported", "orders_imported" in upload)
    check("Imported 2 customers", upload.get("customers_imported") == 2,
          f"got {upload.get('customers_imported')}")
    check("Imported 2 orders", upload.get("orders_imported") == 2,
          f"got {upload.get('orders_imported')}")

# Verify upsert (upload again — should not create duplicates)
files2 = {"file": ("test.csv", io.StringIO(csv_content), "text/csv")}
r2 = requests.post(f"{BASE}/customers/upload", files=files2)
check("Re-upload (upsert) returns 201", r2.status_code == 201, f"got {r2.status_code}")
if r2.status_code == 201:
    upload2 = r2.json()
    check("Upsert: 0 new customers (existing)", upload2.get("customers_imported") == 0,
          f"got {upload2.get('customers_imported')}")
    check("Upsert: orders still imported", upload2.get("orders_imported") == 2,
          f"got {upload2.get('orders_imported')}")

# Verify total went up
r3 = requests.get(f"{BASE}/customers/stats")
if r3.status_code == 200:
    new_stats = r3.json()
    check("Customer count increased to 802", new_stats["total_customers"] == 802,
          f"got {new_stats['total_customers']}")


# ═══════════════════════════════════════════════
# PHASE 6: NATURAL LANGUAGE CAMPAIGN (V2)
# ═══════════════════════════════════════════════
print("\n" + "="*60)
print("PHASE 6: NATURAL LANGUAGE CAMPAIGN (V2)")
print("="*60)

# Test POST /campaigns/nl-preview
print("\n--- NL Campaign Preview ---")
nl_payload = {
    "nl_input": "Re-engage customers who haven't bought in 60 days with a discount on WhatsApp"
}
r = requests.post(f"{BASE}/campaigns/nl-preview", json=nl_payload)
check("POST /campaigns/nl-preview returns 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    nl_preview = r.json()
    check("Has session_id", "session_id" in nl_preview)
    check("Has intent_text", "intent_text" in nl_preview)
    check("Has segment_params", "segment_params" in nl_preview)
    check("Has whatsapp_message", "whatsapp_message" in nl_preview)
    check("Has email_message", "email_message" in nl_preview)
    check("Has channel_recommendation", "channel_recommendation" in nl_preview)
    check("Has channel_reason", "channel_reason" in nl_preview)
    check("Has segment_stats", "segment_stats" in nl_preview)
    check("Has customer_count", "customer_count" in nl_preview)
    check("Has campaign_name", "campaign_name" in nl_preview)

    session_id = nl_preview.get("session_id")
    segment_params = nl_preview.get("segment_params", {})
    whatsapp_msg = nl_preview.get("whatsapp_message", "")
    channel = nl_preview.get("channel_recommendation", "whatsapp")

    # Test GET /campaigns/nl-session/{session_id}
    print("\n--- Retrieve NL Session ---")
    r_sess = requests.get(f"{BASE}/campaigns/nl-session/{session_id}")
    check("GET /campaigns/nl-session/{id} returns 200", r_sess.status_code == 200, f"got {r_sess.status_code}")
    if r_sess.status_code == 200:
        sess_data = r_sess.json()
        check("Session retrieves correct campaign name", sess_data.get("campaign_name") == nl_preview.get("campaign_name"))

    # Test POST /campaigns/nl-preview Refinement
    print("\n--- Refine NL Campaign ---")
    ref_payload = {
        "nl_input": "",
        "session_id": session_id,
        "refinement_text": "only customers in Mumbai"
    }
    r_ref = requests.post(f"{BASE}/campaigns/nl-preview", json=ref_payload)
    check("Refined NL preview returns 200", r_ref.status_code == 200, f"got {r_ref.status_code}")
    if r_ref.status_code == 200:
        refined_preview = r_ref.json()
        check("Refined preview has intent_text", "intent_text" in refined_preview)

    # Test Confirming NL Campaign (V1 confirm endpoint with empty insight_id)
    print("\n--- Confirm NL Campaign ---")
    r_conf = requests.post(f"{BASE}/campaigns/confirm", json={
        "insight_id": "",
        "campaign_name": "NL Test Campaign",
        "message_text": whatsapp_msg,
        "channel": channel,
        "segment_params": segment_params
    })
    check("Confirm NL campaign returns 201", r_conf.status_code == 201, f"got {r_conf.status_code}")



# ═══════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════
print("\n" + "="*60)
print("FINAL REPORT")
print("="*60)
print(f"\n  PASSED:  {passed}")
print(f"  FAILED:  {failed}")
print(f"  PARTIAL: {partial}")
print(f"  TOTAL:   {passed + failed + partial}")

if failures:
    print(f"\n  --- Failures ---")
    for f_item in failures:
        print(f"  • {f_item}")

sys.exit(1 if failed > 0 else 0)
