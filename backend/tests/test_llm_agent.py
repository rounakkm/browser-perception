"""Unit tests for the LLM-powered browser agent and provider abstraction."""
import json
import pytest
from backend.agent_gateway.llm_agent import LLMBrowserAgent
from backend.agent_gateway.llm_provider import MockLLMProvider, get_llm_provider
from backend.models.domain import SanitizedElement, SanitizedPageState, AgentAction
from backend.security.store import value_store
from backend.sanitization.engine import SanitizationEngine
from backend.models.domain import PageState, DOMElement


def create_sample_sanitized_state() -> SanitizedPageState:
    """Create a sample sanitized state containing tokenized PII fields."""
    return SanitizedPageState(
        url="http://127.0.0.1:8080/profile",
        title="User Profile Page",
        elements=[
            SanitizedElement(
                element_id="login_email",
                type="input",
                role="input",
                label="Email Address",
                value="[EMAIL_0]",
                sensitive=True,
                is_interactive=True
            ),
            SanitizedElement(
                element_id="login_password",
                type="input",
                role="input",
                label="Security Password",
                value="[PASSWORD_1]",
                sensitive=True,
                is_interactive=True
            ),
            SanitizedElement(
                element_id="public_note",
                type="input",
                role="input",
                label="Public Bio",
                value="Hello world",
                sensitive=False,
                is_interactive=True
            ),
            SanitizedElement(
                element_id="login_btn",
                type="button",
                role="button",
                label="Sign In",
                text="Sign In",
                sensitive=False,
                is_interactive=True
            )
        ],
        viewport={"width": 1280, "height": 800},
        timestamp=1000.0
    )


def test_agent_prompt_never_contains_raw_sensitive_values():
    """Verify privacy boundary: raw sensitive PII is NEVER present in the LLM prompt."""
    raw_email = "rahul@example.com"
    raw_pass = "secret1234"
    value_store.clear()
    sanitizer = SanitizationEngine()
    raw_page = PageState(
        url="http://127.0.0.1:8080/profile",
        title="User Profile",
        dom_elements=[
            DOMElement(element_id="login_email", type="input", label="Email", value=raw_email, is_interactive=True),
            DOMElement(element_id="login_password", type="input", label="Password", value=raw_pass, is_interactive=True)
        ],
        viewport={"width": 1000, "height": 800},
        timestamp=1.0
    )
    sanitized_state = sanitizer.sanitize(raw_page, scope_id="session-test")
    mock_provider = MockLLMProvider()
    agent = LLMBrowserAgent(task="Fill login form", provider=mock_provider)
    prompt = agent.build_user_prompt(sanitized_state)

    assert raw_email not in prompt
    assert raw_pass not in prompt
    assert "[EMAIL_" in prompt
    assert "[PASSWORD_" in prompt


def test_llm_valid_json_response_parsing():
    """Verify structured JSON actions from LLM are converted to AgentAction models."""
    state = create_sample_sanitized_state()

    resp_fill = json.dumps({"action": "fill", "element_id": "login_email", "value_token": "[EMAIL_0]"})
    agent_fill = LLMBrowserAgent(provider=MockLLMProvider(fixed_response=resp_fill))
    act_fill = agent_fill.next_action(state)
    assert isinstance(act_fill, AgentAction)
    assert act_fill.action == "fill"
    assert act_fill.element_id == "login_email"
    assert act_fill.value_token == "[EMAIL_0]"
    resp_click = json.dumps({"action": "click", "element_id": "login_btn"})
    agent_click = LLMBrowserAgent(provider=MockLLMProvider(fixed_response=resp_click))
    act_click = agent_click.next_action(state)
    assert isinstance(act_click, AgentAction)
    assert act_click.action == "click"
    assert act_click.element_id == "login_btn"
    resp_done = json.dumps({"action": "done", "reason": "Completed all steps"})
    agent_done = LLMBrowserAgent(provider=MockLLMProvider(fixed_response=resp_done))
    act_done = agent_done.next_action(state)
    assert act_done is None


def test_llm_markdown_wrapped_json_parsing():
    """Verify JSON wrapped in markdown code blocks is correctly parsed."""
    state = create_sample_sanitized_state()
    wrapped_resp = "```json\n{\"action\": \"click\", \"element_id\": \"login_btn\"}\n```"
    agent = LLMBrowserAgent(provider=MockLLMProvider(fixed_response=wrapped_resp))
    action = agent.next_action(state)
    assert action is not None
    assert action.action == "click"
    assert action.element_id == "login_btn"


def test_invalid_llm_responses_are_rejected():
    """Verify malformed JSON or invalid element IDs produce appropriate exceptions."""
    state = create_sample_sanitized_state()

    agent_bad_json = LLMBrowserAgent(provider=MockLLMProvider(fixed_response="Not JSON text"))
    with pytest.raises(ValueError, match="not valid JSON"):
        agent_bad_json.next_action(state)
    agent_bad_act = LLMBrowserAgent(provider=MockLLMProvider(fixed_response=json.dumps({"action": "invalid_action", "element_id": "login_btn"})))
    with pytest.raises(ValueError, match="Invalid or missing action"):
        agent_bad_act.next_action(state)

    agent_missing_el = LLMBrowserAgent(provider=MockLLMProvider(fixed_response=json.dumps({"action": "click", "element_id": "nonexistent_button"})))
    with pytest.raises(ValueError, match="does not exist on the current page"):
        agent_missing_el.next_action(state)


def test_provider_factory_fallback():
    """Verify provider factory returns MockLLMProvider when no API keys are configured."""
    provider = get_llm_provider(provider_name="mock")
    assert isinstance(provider, MockLLMProvider)


def test_gemini_model_configuration(monkeypatch):
    """Verify GeminiLLMProvider uses gemini-3.6-flash default and respects GEMINI_MODEL env var."""
    from backend.agent_gateway.llm_provider import GeminiLLMProvider
    monkeypatch.setenv("GEMINI_API_KEY", "dummy_test_key")
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    provider_default = GeminiLLMProvider()
    assert provider_default.model == "gemini-3.6-flash"
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.6-flash")
    provider_custom = GeminiLLMProvider()
    assert provider_custom.model == "gemini-3.6-flash"


def test_gemini_interactions_api_mocked(monkeypatch):
    """Verify GeminiLLMProvider correctly parses Gemini Interactions API response without network calls."""
    from backend.agent_gateway.llm_provider import GeminiLLMProvider
    import httpx

    monkeypatch.setenv("GEMINI_API_KEY", "dummy_key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.6-flash")

    expected_json_action = '{"action": "click", "element_id": "login_btn"}'

    def mock_post(self_client, url, headers=None, json=None):
        class MockResponse:
            status_code = 200
            def json(self):
                return {"output": {"text": expected_json_action}}
            def raise_for_status(self):
                pass
        return MockResponse()

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    provider = GeminiLLMProvider()
    result = provider.generate("Test prompt", "Test system prompt")
    assert result == expected_json_action


