from pathlib import Path

import pytest

from backend.actions.validator import ActionValidator
from backend.browser.extension_bridge import ExtensionBridge
from backend.models.domain import AgentAction, DOMElement, PageState
from backend.sanitization.engine import SanitizationEngine
from backend.security.origin_policy import origin_decision
from backend.security.store import value_store


def page(url: str, value: str = "45892310452") -> PageState:
    return PageState(url=url, title="Safe page", viewport={"width": 800, "height": 600}, timestamp=1.0, dom_elements=[
        DOMElement(element_id="account", type="input", label="Account Number", value=value, is_interactive=True),
        DOMElement(element_id="note", type="input", label="Public note", value="hello", is_interactive=True),
        DOMElement(element_id="save", type="button", label="Save", text="Save", is_interactive=True),
    ])


def test_origin_policy_preserves_local_demo_and_allows_harmless_https():
    assert origin_decision("http://127.0.0.1:8080/profile")[0]
    assert origin_decision("https://example.com/forms")[0]


@pytest.mark.parametrize("url", [
    "https://bank.example.com/", "https://example.com/login", "https://wallet.example.org/", "http://example.com/",
])
def test_high_risk_or_non_https_origins_are_rejected(url):
    assert not origin_decision(url)[0]


def test_session_scoped_tokens_and_page_revisions_prevent_cross_page_actions():
    value_store.clear()
    sanitizer = SanitizationEngine()
    first = sanitizer.sanitize(page("https://example.com/profile"), scope_id="one")
    second = sanitizer.sanitize(page("https://example.org/profile"), scope_id="two")
    validator = ActionValidator()
    token = first.elements[0].value
    assert value_store.get_value(token, "one") == "45892310452"
    assert value_store.get_value(token, "two") is None
    with pytest.raises(ValueError):
        validator.validate(AgentAction(action="fill", element_id="account", value_token=token), second, scope_id="two")
    assert second.elements[1].value == "hello"
    bridge = ExtensionBridge()
    assert bridge.save_state("one", first).page_revision == 1
    assert bridge.save_state("one", first).page_revision == 2


def test_extension_declares_optional_per_site_https_permission_and_no_script_execution():
    root = Path(__file__).resolve().parents[2]
    manifest = (root / "extension" / "manifest.json").read_text()
    content = (root / "extension" / "content.js").read_text()
    assert '"optional_host_permissions": ["https://*/*"]' in manifest
    assert "<all_urls>" not in manifest
    assert "chrome.permissions.request" in (root / "extension" / "background.js").read_text()
    assert "eval(" not in content
    assert "new Function" not in content
    assert '["click", "fill", "submit"].includes(action.action)' in content


@pytest.mark.asyncio
async def test_gateway_rejects_stale_and_unsupported_extension_actions(monkeypatch):
    from backend.api import gateway

    value_store.clear()
    bridge = ExtensionBridge()
    state = SanitizationEngine().sanitize(page("https://example.com/form"), scope_id="session-a")
    record = bridge.save_state("session-a", state)
    monkeypatch.setattr(gateway, "extension_bridge", bridge)
    monkeypatch.setattr(gateway, "action_validator", ActionValidator())
    monkeypatch.setattr(gateway, "current_sanitized_state", state)

    valid = await gateway.perform_action(AgentAction(action="click", element_id="save", session_id="session-a", page_revision=record.page_revision))
    assert valid.success
    stale = await gateway.perform_action(AgentAction(action="click", element_id="save", session_id="session-a", page_revision=0))
    assert not stale.success and "Stale" in stale.error
    unsupported = await gateway.perform_action(AgentAction(action="scroll", element_id="save", session_id="session-a", page_revision=record.page_revision))
    assert not unsupported.success and "not supported" in unsupported.error
