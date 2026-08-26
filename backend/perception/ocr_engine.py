import re
from typing import List, Optional
from backend.models.domain import VisualElement, DOMElement

class OCRPerceptionEngine:
    """
    Lightweight OCR Engine interface.
    Extracts visually rendered text elements from screenshot regions or rendered DOM text cards
    where sensitive values appear outside standard form inputs.
    """
    def extract_visual_text(self, elements: List[DOMElement], screenshot_path: Optional[str] = None) -> List[VisualElement]:
        visual_findings = []
        
        
            if not elem.is_interactive and elem.text:
                
                if any(kw in elem.text.lower() for kw in ["account", "email", "phone", "pin", "card"]):
                    visual_findings.append(VisualElement(
                        bbox=elem.bbox or [0, 0, 0, 0],
                        text_content=elem.text,
                        confidence=0.95
                    ))
                    
        return visual_findings
