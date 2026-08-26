import pytest
import json
from backend.models.domain import PageState, DOMElement
from backend.sanitization.engine import SanitizationEngine
from backend.pii.detector import PIIDetector
from backend.security.store import value_store

SYNTHETIC_SECRETS = [
    "Rahul Mehta",
    "rahul@example.com",
    "+91 9876543210",
    "42 Park Avenue, Connaught Place, New Delhi",
    "45892310452",
    "1234"
]

@pytest.fixture
def profile_page_state():
    return PageState(
        url="http://127.0.0.1:8080/profile",
        title="Account Settings & Profile",
        dom_elements=[
            DOMElement(element_id="full_name", type="input", label="Full Name", value="Rahul Mehta", is_interactive=True),
            DOMElement(element_id="email", type="input", label="Email Address", value="rahul@example.com", is_interactive=True),
            DOMElement(element_id="phone", type="input", label="Phone Number", value="+91 9876543210", is_interactive=True),
            DOMElement(element_id="address", type="input", label="Residential Address", value="42 Park Avenue, Connaught Place, New Delhi", is_interactive=True),
            DOMElement(element_id="account_number", type="input", label="Bank Account Number", value="45892310452", is_interactive=True),
            DOMElement(element_id="pin", type="input", label="Security PIN", value="1234", is_interactive=True),
            DOMElement(element_id="save_btn", type="button", label="Save Changes", text="Save Changes", is_interactive=True),
        ],
        viewport={"width": 1280, "height": 800},
        timestamp=100.0
    )

def test_no_synthetic_secrets_in_agent_payload(profile_page_state):
    value_store.clear()
    sanitizer = SanitizationEngine()
    
    sanitized_state = sanitizer.sanitize(profile_page_state)
    payload_json = sanitized_state.model_dump_json()
    
    for secret in SYNTHETIC_SECRETS:
        assert secret not in payload_json, f"CRITICAL LEAK: Synthetic secret '{secret}' found in agent payload!"
        

    assert "[PERSON_NAME" in payload_json
    assert "[EMAIL" in payload_json
    assert "[PHONE" in payload_json
    assert "[ADDRESS" in payload_json
    assert "[ACCOUNT_NUMBER" in payload_json
    assert "[PASSWORD" in payload_json or "[PIN" in payload_json

def test_label_is_never_input_value(profile_page_state):
    sanitizer = SanitizationEngine()
    sanitized_state = sanitizer.sanitize(profile_page_state)
    
    for elem in sanitized_state.elements:
        if elem.element_id == "full_name":
            assert elem.label == "Full Name"
            assert elem.label != "Rahul Mehta"
        elif elem.element_id == "account_number":
            assert elem.label == "Bank Account Number"
            assert elem.label != "45892310452"
