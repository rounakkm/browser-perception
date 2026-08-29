from backend.actions.validator import ActionValidator
from backend.browser.extension_bridge import ExtensionBridge
from backend.models.domain import AgentAction, DOMElement, PageState
from backend.sanitization.engine import SanitizationEngine
from backend.security.store import value_store


def extension_page():
    return PageState(url="http://127.0.0.1:8080/profile", title="Profile", viewport={"width": 800, "height": 600}, timestamp=1.0, dom_elements=[
        DOMElement(element_id="account_number", type="text", label="Account Number", value="45892310452", is_interactive=True),
        DOMElement(element_id="amount", type="number", label="Amount", value="", is_interactive=True),
        DOMElement(element_id="transfer", type="button", label="Transfer", text="Transfer", is_interactive=True),
    ])


def test_extension_boundary_keeps_raw_value_out_of_agent_state_and_logs():
    value_store.clear()
    state = SanitizationEngine().sanitize(extension_page())
    bridge = ExtensionBridge()
    bridge.save_state("chrome-tab", state)
    agent_payload = bridge.get_state("chrome-tab").model_dump_json()
    assert "45892310452" not in agent_payload
    assert "[ACCOUNT_NUMBER_" in agent_payload
    token = state.elements[0].value
    assert value_store.get_value(token) == "45892310452"


def test_sensitive_action_requires_valid_token_and_dispatches_only_after_resolution():
    value_store.clear()
    state = SanitizationEngine().sanitize(extension_page())
    validator = ActionValidator()
    valid = AgentAction(action="fill", element_id="account_number", value_token=state.elements[0].value)
    assert validator.validate(valid, state)
    with __import__("pytest").raises(ValueError):
        validator.validate(AgentAction(action="fill", element_id="account_number", value_token="[ACCOUNT_NUMBER_999]"), state)
    with __import__("pytest").raises(ValueError):
        validator.validate(AgentAction(action="fill", element_id="missing", value="x"), state)
    bridge = ExtensionBridge()
    queued = bridge.enqueue("chrome-tab", action="fill", element_id="account_number", value=value_store.get_value(valid.value_token))
    extension_action = bridge.next_action("chrome-tab")
    assert extension_action.action_id == queued.action_id
    assert extension_action.value == "45892310452"
