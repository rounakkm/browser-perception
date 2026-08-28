"""Integration tests for Chrome Extension Bridge and LLM Browser Agent gateway endpoints."""
import pytest
from fastapi.testclient import TestClient
from backend.api.gateway import app, extension_bridge
from backend.agent_gateway.llm_agent import LLMBrowserAgent
from backend.agent_gateway.llm_provider import MockLLMProvider
from backend.security.store import value_store
import json


@pytest.fixture
def client():
    return TestClient(app)


def test_chrome_extension_perception_ingestion_and_llm_agent_flow(client):
    """Test full cycle: extension posts perception -> gateway sanitizes -> LLM agent gets context -> posts action."""
    value_store.clear()

    perception_payload = {
        "session_id": "test_session_123",
        "page": {
            "url": "http://127.0.0.1:8080/profile",
            "title": "User Profile",
            "dom_elements": [
                {
                    "element_id": "email_field",
                    "type": "input",
                    "label": "Email Address",
                    "value": "user@example.com",
                    "is_interactive": True
                },
                {
                    "element_id": "submit_btn",
                    "type": "button",
                    "label": "Save Changes",
                    "text": "Save Changes",
                    "is_interactive": True
                }
            ],
            "viewport": {"width": 1280, "height": 800},
            "timestamp": 1000.0
        }
    }

    # 1. Extension posts perception
    resp_perception = client.post("/browser/perception", json=perception_payload)
    assert resp_perception.status_code == 200
    sanitized_page = resp_perception.json()
    assert "user@example.com" not in json.dumps(sanitized_page)

    # 2. Agent fetches context
    resp_context = client.post("/agent/context?task=Update+profile&session_id=test_session_123")
    assert resp_context.status_code == 200
    context = resp_context.json()
    assert context["session_id"] == "test_session_123"

    # 3. LLM Agent processes state and returns action
    from backend.models.domain import SanitizedPageState
    sanitized_state = SanitizedPageState.model_validate(context["page"])

    mock_llm_response = json.dumps({"action": "fill", "element_id": "email_field", "value_token": "[EMAIL_0]"})
    llm_agent = LLMBrowserAgent(task="Update email", provider=MockLLMProvider(fixed_response=mock_llm_response))

    action = llm_agent.next_action(sanitized_state)
    assert action is not None
    assert action.action == "fill"
    assert action.element_id == "email_field"
    assert action.value_token == "[EMAIL_0]"

    # 4. Agent posts action to gateway
    action.session_id = "test_session_123"
    action.page_revision = context["page_revision"]
    resp_action = client.post("/agent/action", json=action.model_dump(exclude_none=True))
    assert resp_action.status_code == 200
    assert resp_action.json()["success"] is True

    # 5. Extension polls for action
    resp_next = client.get("/browser/actions/next?session_id=test_session_123")
    assert resp_next.status_code == 200
    queued_action = resp_next.json()
    assert queued_action["action"] == "fill"
    assert queued_action["element_id"] == "email_field"
    assert queued_action["value"] == "user@example.com"  # Backend resolved token!
