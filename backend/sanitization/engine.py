import re
from backend.models.domain import PageState, SanitizedPageState, SanitizedElement
from backend.pii.detector import PIIDetector
from backend.security.store import value_store

DEFAULT_SAMPLE_SECRETS = {
    "PERSON_NAME": "Rahul Mehta",
    "EMAIL": "rahul@example.com",
    "PHONE": "+91 9876543210",
    "ADDRESS": "42 Park Avenue, Connaught Place, New Delhi",
    "ACCOUNT_NUMBER": "45892310452",
    "PASSWORD": "1234",
    "PIN": "1234"
}

class SanitizationEngine:
    def __init__(self):
        self.detector = PIIDetector()

    def sanitize(self, page_state: PageState) -> SanitizedPageState:
        sanitized_elements = []
        
        for elem in page_state.dom_elements:
            finding = self.detector.analyze_element(elem)
            
            sanitized_elem = SanitizedElement(
                element_id=elem.element_id,
                type=elem.type,
                role=elem.role,
                label=elem.label,
                bbox=elem.bbox,
                is_interactive=elem.is_interactive,
                sensitive=False
            )
            
            if finding:
                sanitized_elem.sensitive = True
                
              
                raw_val = elem.value if elem.value else DEFAULT_SAMPLE_SECRETS.get(finding.category, "secret_value")
                token = value_store.store_value(raw_val, finding.category)
                sanitized_elem.value = token
                
                
                if elem.text:
                   
                    sanitized_text = elem.text
                    for category, pattern in self.detector.patterns.items():
                        matches = pattern.findall(sanitized_text)
                        for match in matches:
                            txt_token = value_store.store_value(match, category)
                            sanitized_text = sanitized_text.replace(match, txt_token)
                    sanitized_elem.text = sanitized_text
            else:
                sanitized_elem.value = elem.value
                sanitized_elem.text = elem.text
                
            sanitized_elements.append(sanitized_elem)
            
        return SanitizedPageState(
            url=page_state.url,
            title=page_state.title,
            elements=sanitized_elements,
            viewport=page_state.viewport,
            timestamp=page_state.timestamp
        )
