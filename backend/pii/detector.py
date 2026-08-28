import re
from typing import List, Optional
from backend.models.domain import DOMElement, PIIFinding

class PIIDetector:
    def __init__(self):
        self.patterns = {
            "EMAIL": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
            "PHONE": re.compile(r"\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}"),
            "INDIAN_PHONE": re.compile(r"(?:\+91[-.\s]?)?(?:0)?[6-9]\d{9}"),
            "AADHAAR": re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b"),
            "PAN": re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b"),
            "IFSC": re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b"),
            "DRIVING_LICENSE": re.compile(r"\b[A-Z]{2}[-\s]?\d{13,16}\b"),
            "ACCOUNT_NUMBER": re.compile(r"\b\d{8,16}\b"),
            "CREDIT_CARD": re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
            "PIN": re.compile(r"\b\d{4,6}\b"),
        }
        self.sensitive_keywords = {
            "name": "PERSON_NAME",
            "full_name": "PERSON_NAME",
            "first_name": "PERSON_NAME",
            "last_name": "PERSON_NAME",
            "email": "EMAIL",
            "phone": "PHONE",
            "mobile": "PHONE",
            "address": "ADDRESS",
            "street": "ADDRESS",
            "account": "ACCOUNT_NUMBER",
            "account_number": "ACCOUNT_NUMBER",
            "password": "PASSWORD",
            "pin": "PIN",
            "secret": "PASSWORD",
            "cvv": "PASSWORD",
            "aadhaar": "AADHAAR",
            "aadhar": "AADHAAR",
            "pan": "PAN",
            "pan_card": "PAN",
            "ifsc": "IFSC",
            "ifsc_code": "IFSC",
            "driving_license": "DRIVING_LICENSE",
            "license_number": "DRIVING_LICENSE",
            "dl_number": "DRIVING_LICENSE",
            "voter_id": "VOTER_ID",
            "voterid": "VOTER_ID",
            "passport": "PASSPORT",
            "passport_number": "PASSPORT",
        }

    def detect_aadhaar(self, text: str) -> bool:
        """Detect Aadhaar number (12 digits with spaces/hyphens)."""
        return bool(self.patterns["AADHAAR"].search(text))

    def detect_pan(self, text: str) -> bool:
        """Detect PAN card number."""
        return bool(self.patterns["PAN"].search(text))

    def detect_indian_phone(self, text: str) -> bool:
        """Detect Indian phone number."""
        return bool(self.patterns["INDIAN_PHONE"].search(text))

    def detect_ifsc(self, text: str) -> bool:
        """Detect IFSC code."""
        return bool(self.patterns["IFSC"].search(text))

    def detect_driving_license(self, text: str) -> bool:
        """Detect driving license number."""
        return bool(self.patterns["DRIVING_LICENSE"].search(text))

    def analyze_element(self, element: DOMElement) -> Optional[PIIFinding]:
        if element.type == "password" or element.attributes.get("type") == "password":
            return PIIFinding(
                element_id=element.element_id,
                category="PASSWORD",
                confidence=1.0,
                source="dom_type",
                value=element.value or ""
            )

        context_text = f"{element.label or ''} {element.attributes.get('name', '')} {element.attributes.get('id', '')}".lower()
        for keyword, category in self.sensitive_keywords.items():
            if keyword in context_text:
                return PIIFinding(
                    element_id=element.element_id,
                    category=category,
                    confidence=0.95,
                    source="dom_semantics",
                    value=element.value or ""
                )

        text_to_check = element.value or element.text or ""
        if text_to_check:
            for category, pattern in self.patterns.items():
                if pattern.search(text_to_check.strip()):
                    return PIIFinding(
                        element_id=element.element_id,
                        category=category,
                        confidence=0.85,
                        source="regex",
                        value=text_to_check
                    )
        return None
