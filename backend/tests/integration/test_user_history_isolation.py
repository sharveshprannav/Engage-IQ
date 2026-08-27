"""
EngageAI — User History Privacy & Per-User Isolation Integration Tests
Verifies that each authenticated user can view, search, manage, and export ONLY their own history,
and that any attempt by one user to access or manipulate another user's history directly results in 403 Forbidden.
"""

import uuid
import pytest
from httpx import AsyncClient


async def create_and_auth_user(client: AsyncClient, email_prefix: str) -> tuple[dict[str, str], str]:
    """Helper to register and login a test user, returning auth headers and user_id."""
    unique_id = uuid.uuid4().hex[:8]
    email = f"{email_prefix}_{unique_id}@engageai-test.io"
    password = "StrongPassword123!"
    full_name = f"Test User {email_prefix.capitalize()}"

    # Register
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name, "role": "viewer"},
    )
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    user_data = reg_res.json()
    user_id = user_data["id"]

    # Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return headers, user_id


@pytest.mark.asyncio
async def test_unauthenticated_requests_fail(async_client: AsyncClient):
    """Unauthenticated requests to history endpoints must return 401 Unauthorized."""
    # List logs
    res = await async_client.get("/api/v1/ml-pipeline/logs")
    assert res.status_code == 401

    # Run inference
    res = await async_client.post(
        "/api/v1/ml-pipeline/predict",
        json={
            "input_type": "text",
            "text_content": "Testing unauthenticated request failure",
            "category_name": "Test",
        },
    )
    assert res.status_code == 401

    # Single log inspection
    res = await async_client.get("/api/v1/ml-pipeline/logs/REQ-12345")
    assert res.status_code == 401

    # Delete single log
    res = await async_client.delete("/api/v1/ml-pipeline/logs/REQ-12345")
    assert res.status_code == 401

    # Clear logs
    res = await async_client.delete("/api/v1/ml-pipeline/logs")
    assert res.status_code == 401

    # Export logs
    res = await async_client.get("/api/v1/ml-pipeline/logs/export?format=csv")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_user_history_creation_and_isolation(async_client: AsyncClient):
    """
    Scenario 1 & 2:
    - User A creates history -> User A can see it.
    - User B logs in -> User B cannot see User A's history.
    """
    headers_a, user_a_id = await create_and_auth_user(async_client, "usera")
    headers_b, user_b_id = await create_and_auth_user(async_client, "userb")

    # User A starts with 0 logs
    res = await async_client.get("/api/v1/ml-pipeline/logs", headers=headers_a)
    assert res.status_code == 200
    assert res.json()["total"] == 0
    assert len(res.json()["items"]) == 0

    # User A executes inference
    pred_res_a = await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_a,
        json={
            "input_type": "text",
            "text_content": "User A sensitive feedback: checkout button throws 500 error on payment gateway.",
            "category_name": "Payment Gateway Bug",
        },
    )
    assert pred_res_a.status_code == 200
    req_a_id = pred_res_a.json()["request_id"]

    # User A now sees 1 log
    logs_res_a = await async_client.get("/api/v1/ml-pipeline/logs", headers=headers_a)
    assert logs_res_a.status_code == 200
    data_a = logs_res_a.json()
    assert data_a["total"] == 1
    assert data_a["items"][0]["request_id"] == req_a_id
    assert data_a["items"][0]["category_name"] == "Payment Gateway Bug"
    log_a_uuid = data_a["items"][0]["id"]

    # User B logs in and fetches history -> MUST return 0 items
    logs_res_b = await async_client.get("/api/v1/ml-pipeline/logs", headers=headers_b)
    assert logs_res_b.status_code == 200
    data_b = logs_res_b.json()
    assert data_b["total"] == 0
    assert len(data_b["items"]) == 0


@pytest.mark.asyncio
async def test_user_b_unauthorized_direct_access_returns_403(async_client: AsyncClient):
    """
    Scenario 3:
    - User B attempts to access User A's history through a manipulated API request -> 403 Forbidden.
    """
    headers_a, _ = await create_and_auth_user(async_client, "usera_access")
    headers_b, _ = await create_and_auth_user(async_client, "userb_access")

    # User A creates inference history
    pred_res = await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_a,
        json={
            "input_type": "text",
            "text_content": "Confidential customer data for User A account",
            "category_name": "Confidential",
        },
    )
    assert pred_res.status_code == 200
    req_a_id = pred_res.json()["request_id"]

    # User A can access own history by request_id
    detail_res_a = await async_client.get(f"/api/v1/ml-pipeline/logs/{req_a_id}", headers=headers_a)
    assert detail_res_a.status_code == 200
    log_a_uuid = detail_res_a.json()["id"]

    # User A can access own history by UUID
    detail_uuid_a = await async_client.get(f"/api/v1/ml-pipeline/logs/{log_a_uuid}", headers=headers_a)
    assert detail_uuid_a.status_code == 200

    # User B attempts to access User A's history by request_id -> 403 Forbidden
    res_b_req = await async_client.get(f"/api/v1/ml-pipeline/logs/{req_a_id}", headers=headers_b)
    assert res_b_req.status_code == 403
    assert "Access forbidden" in res_b_req.text

    # User B attempts to access User A's history by UUID -> 403 Forbidden
    res_b_uuid = await async_client.get(f"/api/v1/ml-pipeline/logs/{log_a_uuid}", headers=headers_b)
    assert res_b_uuid.status_code == 403
    assert "Access forbidden" in res_b_uuid.text

    # Non-existent ID returns 404
    non_existent = "non-existent-req-999"
    res_404 = await async_client.get(f"/api/v1/ml-pipeline/logs/{non_existent}", headers=headers_b)
    assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_user_b_unauthorized_modification_returns_403(async_client: AsyncClient):
    """
    Scenario 4:
    - User B attempts to update or submit feedback on User A's history -> 403 Forbidden.
    """
    headers_a, _ = await create_and_auth_user(async_client, "usera_mod")
    headers_b, _ = await create_and_auth_user(async_client, "userb_mod")

    # User A creates inference history
    pred_res = await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_a,
        json={
            "input_type": "text",
            "text_content": "User A performance feedback",
            "category_name": "Performance",
        },
    )
    req_a_id = pred_res.json()["request_id"]

    # User B attempts feedback on User A's request_id -> 403 Forbidden
    feedback_res = await async_client.post(
        "/api/v1/ml-pipeline/feedback",
        headers=headers_b,
        json={
            "request_id": req_a_id,
            "task": "sentiment",
            "predicted_label": "positive",
            "corrected_label": "negative",
            "correction_note": "Malicious tampering attempt by User B",
        },
    )
    assert feedback_res.status_code == 403

    # User B attempts PATCH on User A's history -> 403 Forbidden
    patch_res = await async_client.patch(
        f"/api/v1/ml-pipeline/logs/{req_a_id}",
        headers=headers_b,
        json={"category_name": "Tampered Category"},
    )
    assert patch_res.status_code == 403


@pytest.mark.asyncio
async def test_user_b_unauthorized_deletion_returns_403(async_client: AsyncClient):
    """
    Scenario 5:
    - User B attempts to delete User A's history -> 403 Forbidden.
    """
    headers_a, _ = await create_and_auth_user(async_client, "usera_del")
    headers_b, _ = await create_and_auth_user(async_client, "userb_del")

    # User A creates inference history
    pred_res = await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_a,
        json={
            "input_type": "text",
            "text_content": "User A mission critical logs",
            "category_name": "Critical",
        },
    )
    req_a_id = pred_res.json()["request_id"]

    # User B attempts DELETE on User A's history -> 403 Forbidden
    del_res = await async_client.delete(f"/api/v1/ml-pipeline/logs/{req_a_id}", headers=headers_b)
    assert del_res.status_code == 403

    # Verify User A's history record was NOT deleted
    get_res = await async_client.get(f"/api/v1/ml-pipeline/logs/{req_a_id}", headers=headers_a)
    assert get_res.status_code == 200
    assert get_res.json()["request_id"] == req_a_id


@pytest.mark.asyncio
async def test_user_a_can_search_update_delete_own_history(async_client: AsyncClient):
    """
    Scenario 6:
    - User A can search, update, and delete their own history.
    """
    headers_a, _ = await create_and_auth_user(async_client, "usera_crud")

    # Create 2 records
    res1 = await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_a,
        json={"input_type": "text", "text_content": "Billing invoice discrepancy issue", "category_name": "Billing"},
    )
    res2 = await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_a,
        json={"input_type": "text", "text_content": "Amazing UI and fast search performance", "category_name": "Praise"},
    )
    req1_id = res1.json()["request_id"]
    req2_id = res2.json()["request_id"]

    # Search by category
    search_res = await async_client.get("/api/v1/ml-pipeline/logs?category=Billing", headers=headers_a)
    assert search_res.status_code == 200
    assert search_res.json()["total"] == 1
    assert search_res.json()["items"][0]["request_id"] == req1_id

    # Search by text term
    search_res2 = await async_client.get("/api/v1/ml-pipeline/logs?search=invoice", headers=headers_a)
    assert search_res2.status_code == 200
    assert search_res2.json()["total"] == 1

    # User A updates record 1
    update_res = await async_client.patch(
        f"/api/v1/ml-pipeline/logs/{req1_id}",
        headers=headers_a,
        json={"category_name": "Billing Escalation", "correction_note": "Verified by support"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["category_name"] == "Billing Escalation"

    # User A deletes record 1
    del_res = await async_client.delete(f"/api/v1/ml-pipeline/logs/{req1_id}", headers=headers_a)
    assert del_res.status_code == 200

    # Verify only record 2 remains
    remaining_res = await async_client.get("/api/v1/ml-pipeline/logs", headers=headers_a)
    assert remaining_res.status_code == 200
    assert remaining_res.json()["total"] == 1
    assert remaining_res.json()["items"][0]["request_id"] == req2_id


@pytest.mark.asyncio
async def test_clear_history_is_isolated_per_user(async_client: AsyncClient):
    """
    Scenario 7:
    - User A clears all history -> Only User A's history is cleared; User B's records remain untouched.
    """
    headers_a, _ = await create_and_auth_user(async_client, "usera_clear")
    headers_b, _ = await create_and_auth_user(async_client, "userb_clear")

    # User A creates 2 records
    await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_a,
        json={"input_type": "text", "text_content": "User A record 1", "category_name": "A1"},
    )
    await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_a,
        json={"input_type": "text", "text_content": "User A record 2", "category_name": "A2"},
    )

    # User B creates 1 record
    b_pred = await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_b,
        json={"input_type": "text", "text_content": "User B record 1", "category_name": "B1"},
    )
    b_req_id = b_pred.json()["request_id"]

    # User A clears history
    clear_res = await async_client.delete("/api/v1/ml-pipeline/logs", headers=headers_a)
    assert clear_res.status_code == 200

    # User A has 0 records
    a_logs = await async_client.get("/api/v1/ml-pipeline/logs", headers=headers_a)
    assert a_logs.json()["total"] == 0

    # User B still has their record intact!
    b_logs = await async_client.get("/api/v1/ml-pipeline/logs", headers=headers_b)
    assert b_logs.json()["total"] == 1
    assert b_logs.json()["items"][0]["request_id"] == b_req_id


@pytest.mark.asyncio
async def test_user_history_export_is_isolated(async_client: AsyncClient):
    """
    Scenario 8:
    - User export produces CSV and JSON containing ONLY that user's history.
    """
    headers_a, _ = await create_and_auth_user(async_client, "usera_exp")
    headers_b, _ = await create_and_auth_user(async_client, "userb_exp")

    # User A creates record
    await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_a,
        json={"input_type": "text", "text_content": "User A exclusive export text", "category_name": "UserA_Cat"},
    )

    # User B creates record
    await async_client.post(
        "/api/v1/ml-pipeline/predict",
        headers=headers_b,
        json={"input_type": "text", "text_content": "User B exclusive export text", "category_name": "UserB_Cat"},
    )

    # User A exports CSV
    csv_res_a = await async_client.get("/api/v1/ml-pipeline/logs/export?format=csv", headers=headers_a)
    assert csv_res_a.status_code == 200
    assert "UserA_Cat" in csv_res_a.text
    assert "UserB_Cat" not in csv_res_a.text

    # User A exports JSON
    json_res_a = await async_client.get("/api/v1/ml-pipeline/logs/export?format=json", headers=headers_a)
    assert json_res_a.status_code == 200
    items_a = json_res_a.json()
    assert len(items_a) == 1
    assert items_a[0]["category_name"] == "UserA_Cat"
