"""
Comprehensive test suite for Browser Perception backend.
Tests cover perception engines, PII detection, API endpoints, and integration scenarios.
"""

import pytest
import os
import tempfile
from unittest.mock import Mock, patch, AsyncMock
import json
from pathlib import Path

# Import modules to test
from backend.models.domain import PageState, DOMElement, SanitizedPageState, SanitizedElement, AgentAction, AgentContext
from backend.sanitization.engine import SanitizationEngine
from backend.pii.detector import PIIDetector
from backend.security.store import value_store
from backend.perception.ocr_engine import OCRPerceptionEngine
from backend.perception.vision_engine import VisionModelPerceptionEngine
from backend.actions.validator import ActionValidator
from backend.config.settings import settings


class TestPIIDetector:
    """Tests for PII detection functionality."""

    def setup_method(self):
        """Setup test fixtures."""
        self.detector = PIIDetector()

    def test_password_field_detection(self):
        """Test detection of password fields."""
        pwd_element = DOMElement(
            element_id="password_field",
            type="password",
            label="Password",
            value="secret123"
        )
        finding = self.detector.analyze_element(pwd_element)

        assert finding is not None
        assert finding.category == "PASSWORD"
        assert finding.confidence == 1.0

    def test_email_detection_by_pattern(self):
        """Test email pattern detection."""
        email_element = DOMElement(
            element_id="email_input",
            type="input",
            label="Email",
            value="user@example.com"
        )
        finding = self.detector.analyze_element(email_element)

        assert finding is not None
        assert finding.category == "EMAIL"
        assert finding.confidence >= 0.85

    def test_phone_detection(self):
        """Test phone number detection."""
        phone_element = DOMElement(
            element_id="phone_input",
            type="input",
            label="Phone Number",
            value="+91 9876543210"
        )
        finding = self.detector.analyze_element(phone_element)

        assert finding is not None
        assert finding.category in ["PHONE", "INDIAN_PHONE"]

    def test_aadhaar_detection(self):
        """Test Aadhaar number detection."""
        aadhaar_element = DOMElement(
            element_id="aadhaar_input",
            type="input",
            label="Aadhaar Number",
            value="1234 5678 9012"
        )
        finding = self.detector.analyze_element(aadhaar_element)

        assert finding is not None
        assert finding.category == "AADHAAR"

    def test_pan_detection(self):
        """Test PAN card detection."""
        pan_element = DOMElement(
            element_id="pan_input",
            type="input",
            label="PAN Card",
            value="ABCDE1234F"
        )
        finding = self.detector.analyze_element(pan_element)

        assert finding is not None
        assert finding.category == "PAN"

    def test_semantic_detection_by_label(self):
        """Test detection based on field labels."""
        account_element = DOMElement(
            element_id="account",
            type="input",
            label="Account Number",
            value="123456789"
        )
        finding = self.detector.analyze_element(account_element)

        assert finding is not None
        assert finding.category == "ACCOUNT_NUMBER"

    def test_indian_phone_detection(self):
        """Test detection of Indian phone formats."""
        assert self.detector.detect_indian_phone("+91 9876543210")
        assert self.detector.detect_indian_phone("09876543210")
        assert not self.detector.detect_indian_phone("1234567890")

    def test_no_detection_for_safe_field(self):
        """Test that safe fields don't trigger PII detection."""
        safe_element = DOMElement(
            element_id="button_submit",
            type="button",
            label="Submit",
            text="Click here"
        )
        finding = self.detector.analyze_element(safe_element)

        assert finding is None


class TestSanitizationEngine:
    """Tests for sanitization pipeline."""

    def setup_method(self):
        """Setup test fixtures."""
        value_store.clear()
        self.sanitizer = SanitizationEngine()

    def test_sensitive_field_tokenization(self):
        """Test that sensitive fields are properly tokenized."""
        page_state = PageState(
            url="http://test.com",
            title="Test",
            dom_elements=[
                DOMElement(
                    element_id="email",
                    type="input",
                    label="Email",
                    value="user@example.com",
                    is_interactive=True
                )
            ],
            viewport={"width": 800, "height": 600},
            timestamp=100.0
        )

        sanitized = self.sanitizer.sanitize(page_state)

        # Check that actual email is replaced with token
        assert sanitized.elements[0].sensitive is True
        assert "[EMAIL" in sanitized.elements[0].value
        assert "user@example.com" not in sanitized.elements[0].value

    def test_no_pii_leakage_in_json(self):
        """Test that PII doesn't leak into JSON output."""
        page_state = PageState(
            url="http://test.com",
            title="Test",
            dom_elements=[
                DOMElement(
                    element_id="password",
                    type="password",
                    label="Password",
                    value="MySecretPassword123!",
                    is_interactive=True
                ),
                DOMElement(
                    element_id="phone",
                    type="input",
                    label="Phone",
                    value="+91 9876543210",
                    is_interactive=True
                )
            ],
            viewport={"width": 800, "height": 600},
            timestamp=100.0
        )

        sanitized = self.sanitizer.sanitize(page_state)
        json_output = sanitized.model_dump_json()

        # Verify no actual values appear
        assert "MySecretPassword123!" not in json_output
        assert "9876543210" not in json_output

    def test_label_preserved_separately_from_value(self):
        """Test that labels are preserved while values are redacted."""
        page_state = PageState(
            url="http://test.com",
            title="Test",
            dom_elements=[
                DOMElement(
                    element_id="full_name",
                    type="input",
                    label="Full Name",
                    value="John Doe",
                    is_interactive=True
                )
            ],
            viewport={"width": 800, "height": 600},
            timestamp=100.0
        )

        sanitized = self.sanitizer.sanitize(page_state)
        elem = sanitized.elements[0]

        # Label should be preserved, value should be tokenized
        assert elem.label == "Full Name"
        assert elem.value.startswith("[PERSON_NAME")
        assert "John Doe" not in elem.value

    def test_value_store_retrieval(self):
        """Test that values can be retrieved from store."""
        original_value = "test@example.com"
        token = value_store.store_value(original_value, "EMAIL")

        retrieved = value_store.get_value(token)
        assert retrieved == original_value

    def test_safe_elements_not_modified(self):
        """Test that non-sensitive elements are not modified."""
        page_state = PageState(
            url="http://test.com",
            title="Test Page",
            dom_elements=[
                DOMElement(
                    element_id="button_submit",
                    type="button",
                    label="Submit",
                    text="Click here",
                    is_interactive=True
                )
            ],
            viewport={"width": 800, "height": 600},
            timestamp=100.0
        )

        sanitized = self.sanitizer.sanitize(page_state)
        elem = sanitized.elements[0]

        assert elem.sensitive is False
        assert elem.text == "Click here"
        assert elem.label == "Submit"


class TestActionValidator:
    """Tests for action validation."""

    def setup_method(self):
        """Setup test fixtures."""
        self.validator = ActionValidator()

    def test_valid_click_action(self):
        """Test validation of valid click action."""
        state = SanitizedPageState(
            url="http://test.com",
            title="Test",
            elements=[
                SanitizedElement(element_id="btn_submit", type="button", is_interactive=True)
            ],
            viewport={"width": 800, "height": 600},
            timestamp=100.0
        )

        action = AgentAction(action="click", element_id="btn_submit")

        assert self.validator.validate(action, state) is True

    def test_invalid_action_type(self):
        """Test rejection of invalid action types."""
        state = SanitizedPageState(
            url="http://test.com",
            title="Test",
            elements=[],
            viewport={"width": 800, "height": 600},
            timestamp=100.0
        )

        action = AgentAction(action="invalid_action", element_id="element")

        with pytest.raises(ValueError):
            self.validator.validate(action, state)

    def test_navigation_without_url(self):
        """Test that navigation requires URL."""
        state = SanitizedPageState(
            url="http://test.com",
            title="Test",
            elements=[],
            viewport={"width": 800, "height": 600},
            timestamp=100.0
        )

        action = AgentAction(action="navigate")

        with pytest.raises(ValueError):
            self.validator.validate(action, state)

    def test_action_missing_element_id(self):
        """Test that actions requiring element_id fail without it."""
        state = SanitizedPageState(
            url="http://test.com",
            title="Test",
            elements=[],
            viewport={"width": 800, "height": 600},
            timestamp=100.0
        )

        action = AgentAction(action="click")

        with pytest.raises(ValueError):
            self.validator.validate(action, state)


class TestOCREngine:
    """Tests for OCR perception engine."""

    def setup_method(self):
        """Setup test fixtures."""
        self.ocr = OCRPerceptionEngine()

    def test_ocr_engine_initialization(self):
        """Test that OCR engine initializes gracefully."""
        assert self.ocr is not None
        # Don't assert on availability - may not have dependencies

    def test_visual_text_extraction_from_dom(self):
        """Test text extraction from DOM elements."""
        elements = [
            DOMElement(
                element_id="account_display",
                type="div",
                text="Account: 1234567890",
                is_interactive=False
            ),
            DOMElement(
                element_id="button",
                type="button",
                text="Click me",
                is_interactive=True
            )
        ]

        findings = self.ocr.extract_visual_text(elements)

        # Should only find non-interactive with sensitive keywords
        assert len(findings) > 0
        assert findings[0].text_content == "Account: 1234567890"

    def test_text_analysis(self):
        """Test comprehensive text analysis."""
        text = "My email is user@example.com and phone is +91 9876543210"

        analysis = self.ocr.analyze_text_content(text)

        assert analysis['has_potential_pii'] is True
        assert len(analysis['keywords']) > 0

    def test_sensitive_keyword_detection(self):
        """Test detection of sensitive keywords."""
        text_with_keywords = "password: secretpass aadhaar: 1234 5678 9012"

        analysis = self.ocr.analyze_text_content(text_with_keywords)

        assert analysis['has_potential_pii'] is True
        assert 'password' in analysis['keywords'] or 'aadhaar' in analysis['keywords']


class TestVisionEngine:
    """Tests for vision perception engine."""

    def setup_method(self):
        """Setup test fixtures."""
        self.vision = VisionModelPerceptionEngine()

    def test_vision_engine_initialization(self):
        """Test that vision engine initializes gracefully."""
        assert self.vision is not None
        # Model may not be available, but engine should initialize

    def test_model_info_available(self):
        """Test that model info can be retrieved."""
        info = self.vision.get_model_info()

        assert 'loaded' in info
        assert 'model_path' in info
        assert 'confidence_threshold' in info
        assert 'device' in info

    def test_preprocessing_with_missing_file(self):
        """Test that preprocessing handles missing files gracefully."""
        result = self.vision._preprocess_image("/nonexistent/file.png")

        assert result is None

    def test_empty_detection_without_model(self):
        """Test that detection returns empty list if model not loaded."""
        detections = self.vision.detect_ui_bounding_boxes("/fake/path.png")

        assert detections == []
        assert isinstance(detections, list)


class TestSettingsConfiguration:
    """Tests for configuration system."""

    def test_settings_defaults(self):
        """Test that settings have reasonable defaults."""
        assert settings.PORT > 0
        assert settings.HOST is not None
        assert settings.VISION_CONFIDENCE_THRESHOLD > 0
        assert settings.VISION_CONFIDENCE_THRESHOLD < 1.0

    def test_device_selection(self):
        """Test device selection logic."""
        device = settings.get_device()

        assert device in ["cpu", "cuda"]

    def test_directory_creation(self):
        """Test that settings can create directories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Override settings temporarily
            original_model_dir = settings.MODEL_DIR
            settings.MODEL_DIR = os.path.join(tmpdir, "models")

            settings.ensure_directories()

            assert os.path.exists(settings.MODEL_DIR)

            # Restore
            settings.MODEL_DIR = original_model_dir


class TestPrivacyBoundary:
    """Integration tests for privacy boundary."""

    def setup_method(self):
        """Setup test fixtures."""
        value_store.clear()

    def test_end_to_end_sanitization(self):
        """Test complete sanitization pipeline."""
        # Simulate a banking page
        page_state = PageState(
            url="http://bank.example.com/account",
            title="Account Settings",
            dom_elements=[
                DOMElement(
                    element_id="name_field",
                    type="input",
                    label="Full Name",
                    value="Rahul Sharma",
                    is_interactive=True
                ),
                DOMElement(
                    element_id="email_field",
                    type="input",
                    label="Email Address",
                    value="rahul@example.com",
                    is_interactive=True
                ),
                DOMElement(
                    element_id="account_field",
                    type="input",
                    label="Account Number",
                    value="1234567890123456",
                    is_interactive=True
                ),
                DOMElement(
                    element_id="pwd_field",
                    type="password",
                    label="Password",
                    value="SecurePass123!",
                    is_interactive=True
                ),
                DOMElement(
                    element_id="submit_btn",
                    type="button",
                    label="Save Changes",
                    text="Save Changes",
                    is_interactive=True
                )
            ],
            viewport={"width": 1280, "height": 800},
            timestamp=100.0
        )

        sanitizer = SanitizationEngine()
        sanitized = sanitizer.sanitize(page_state)

        # Verify sanitization
        json_output = sanitized.model_dump_json()

        # No PII should appear in JSON
        assert "Rahul Sharma" not in json_output
        assert "rahul@example.com" not in json_output
        assert "1234567890123456" not in json_output
        assert "SecurePass123!" not in json_output

        # All values should be tokenized
        for elem in sanitized.elements:
            if elem.sensitive:
                assert elem.value.startswith("[")
                assert elem.value.endswith("]")

        # Labels should be preserved
        name_elem = next(e for e in sanitized.elements if e.element_id == "name_field")
        assert name_elem.label == "Full Name"


# Async fixtures for API tests
@pytest.fixture
async def mock_browser():
    """Mock browser connector."""
    browser = AsyncMock()
    browser.get_url.return_value = "http://test.com"
    browser.get_title.return_value = "Test Page"
    browser.get_viewport.return_value = {"width": 1280, "height": 800}
    browser.extract_dom_elements.return_value = []
    browser.screenshot.return_value = None
    return browser


class TestAPIEndpoints:
    """Tests for API endpoints."""

    @pytest.mark.asyncio
    async def test_health_check(self, mock_browser):
        """Test health check endpoint."""
        from backend.api.gateway import app, startup_event, browser as global_browser

        # Would need proper async setup - this is a placeholder
        # In practice, use FastAPI TestClient or httpx AsyncClient


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
