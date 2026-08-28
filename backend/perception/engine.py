from typing import List, Optional
from backend.models.domain import DOMElement, VisualElement
from backend.perception.dom_engine import DOMPerceptionEngine
from backend.perception.ocr_engine import OCRPerceptionEngine
from backend.perception.vision_engine import VisionModelPerceptionEngine

class PerceptionEngine:
    """
    Unified Perception Engine orchestrating multi-modal local perception:
    - DOM & Accessibility Tree
    - OCR Visual Text Extraction
    - Modular Local Vision Model
    """
    def __init__(self):
        self.dom_engine = DOMPerceptionEngine()
        self.ocr_engine = OCRPerceptionEngine()
        self.vision_engine = VisionModelPerceptionEngine()

    def perceive(self, raw_dom_elements: List[DOMElement], screenshot_path: Optional[str] = None) -> List[DOMElement]:
        perceived_dom = self.dom_engine.process_elements(raw_dom_elements)
        ocr_findings = self.ocr_engine.extract_visual_text(perceived_dom, screenshot_path)
        if screenshot_path:
            vision_boxes = self.vision_engine.detect_ui_bounding_boxes(screenshot_path)
        return perceived_dom
