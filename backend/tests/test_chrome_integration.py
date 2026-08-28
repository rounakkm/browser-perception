"""Integration test for the real Chrome extension perception and action loop."""
import pytest
from httpx import AsyncClient, ASGITransport

from backend.api.gateway import app
from backend.security.store import value_store


@pytest.mark.asyncio
async def test_real_chrome_perception_and_action_pipeline_flow():
    value_store.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        session_id = "real-chrome-test-session-001"
        perception_payload = {
            "session_id": session_id,
            "page": {
                "url": "http://127.0.0.1:8080/profile",
                "title": "Account Settings & Profile",
                "dom_elements": [
                    {
                        "element_id": "full_name",
                        "type": "input",
                        "role": "input",
                        "label": "Full Name",
                        "value": "Rahul Mehta",
                        "text": None,
                        "bbox": [10, 20, 200, 30],
                        "attributes": {"name": "full_name", "id": "full_name"},
                        "is_interactive": True
                    },
                    {
                        "element_id": "email",
                        "type": "input",
                        "role": "input",
                        "label": "Email Address",
                        "value": "rahul@example.com",
                        "text": None,
                        "bbox": [10, 60, 200, 30],
                        "attributes": {"name": "email", "id": "email"},
                        "is_interactive": True
                    },
                    {
                        "element_id": "save_btn",
                        "type": "button",
                        "role": "button",
                        "label": "Save Changes",
                        "value": None,
                        "text": "Save Changes",
                        "bbox": [10, 100, 100, 40],
                        "attributes": {"id": "save_btn"},
                        "is_interactive": True
                    }
                ],
                "viewport": {"width": 1280, "height": 800},
                "timestamp": 1724850000.0
            }
        }
        perc_resp = await client.post("/browser/perception", json=perception_payload)
        assert perc_resp.status_code == 200
        sanitized = perc_resp.json()
        assert sanitized["url"] == "http://127.0.0.1:8080/profile"
        ctx_resp = await client.post(f"/agent/context?task=Update profile&session_id={session_id}")
        assert ctx_resp.status_code == 200
        ctx_data = ctx_resp.json()
        assert ctx_data["session_id"] == session_id
        assert ctx_data["page_revision"] == 1
        elements = ctx_data["page"]["elements"]
        name_elem = next(e for e in elements if e["element_id"] == "full_name")
        email_elem = next(e for e in elements if e["element_id"] == "email")
        assert name_elem["sensitive"] is True
        assert name_elem["value"].startswith("[PERSON_NAME_")
        assert name_elem["value"] != "Rahul Mehta"
        assert email_elem["sensitive"] is True
        assert email_elem["value"].startswith("[EMAIL_")
        assert email_elem["value"] != "rahul@example.com"
        name_token = name_elem["value"]
        action_payload = {
            "session_id": session_id,
            "page_revision": 1,
            "action": "fill",
            "element_id": "full_name",
            "value_token": name_token
        }
        act_resp = await client.post("/agent/action", json=action_payload)
        assert act_resp.status_code == 200
        assert act_resp.json()["success"] is True
        next_act_resp = await client.get(f"/browser/actions/next?session_id={session_id}")
        assert next_act_resp.status_code == 200
        queued_action = next_act_resp.json()
        assert queued_action["action"] == "fill"
        assert queued_action["element_id"] == "full_name"
        assert queued_action["value"] == "Rahul Mehta"
        result_payload = {
            "session_id": session_id,
            "action_id": queued_action["action_id"],
            "success": True
        }
        res_resp = await client.post("/browser/actions/result", json=result_payload)
        assert res_resp.status_code == 200
        assert res_resp.json()["ok"] is True
