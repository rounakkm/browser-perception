import pytest
from backend.models.domain import PageState, DOMElement
from backend.sanitization.engine import SanitizationEngine
from backend.pii.detector import PIIDetector
from backend.security.store import value_store

@pytest.fixture
def mock_page_state():
    return PageState(
        url="http://test.com",
        title="Test Bank",
        dom_elements=[
            DOMElement(element_id="input_1", type="input", label="Account Number", value="1234567890", is_interactive=True),
            DOMElement(element_id="input_2", type="input", label="Email", value="test@test.com", is_interactive=True),
            DOMElement(element_id="btn_1", type="button", text="Submit", is_interactive=True)
        ],
        viewport={"width": 800, "height": 600},
        timestamp=12345.6
    )

def test_pii_detector():
    detector = PIIDetector()

    acc_element = DOMElement(element_id="1", type="input", label="Account", value="1234567890")
    finding = detector.analyze_element(acc_element)
    assert finding is not None
    assert finding.category == "ACCOUNT_NUMBER"

    btn_element = DOMElement(element_id="2", type="button", text="Submit")
    assert detector.analyze_element(btn_element) is None

def test_privacy_boundary(mock_page_state):

    value_store.clear()

    sanitizer = SanitizationEngine()
    sanitized_state = sanitizer.sanitize(mock_page_state)

    assert len(sanitized_state.elements) == len(mock_page_state.dom_elements)

    for element in sanitized_state.elements:
        if element.element_id == "input_1":
            assert element.sensitive is True
            assert element.value.startswith("[ACCOUNT_NUMBER")

            assert "1234567890" not in str(element.model_dump())

        elif element.element_id == "input_2":
            assert element.sensitive is True
            assert element.value.startswith("[EMAIL")
            assert "test@test.com" not in str(element.model_dump())

        elif element.element_id == "btn_1":
            assert element.sensitive is False
            assert element.text == "Submit"

    token = sanitized_state.elements[0].value
    assert value_store.get_value(token) == "1234567890"

def test_api_payload_does_not_leak_store():

    from backend.api.gateway import AgentContext

    sanitized_state = SanitizationEngine().sanitize(
        PageState(
            url="http://test.com",
            title="Test",
            dom_elements=[DOMElement(element_id="1", type="input", label="Account", value="1234567890")],
            viewport={"width": 800, "height": 600},
            timestamp=123.0
        )
    )

    context = AgentContext(task="test", page=sanitized_state)
    payload_json = context.model_dump_json()

    assert "1234567890" not in payload_json
    assert "value_store" not in payload_json.lower()
