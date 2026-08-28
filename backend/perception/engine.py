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

    def perceive(self, raw_dom_elements: List[DOMElement], screenshot_path: Optional[str] = None):
        import time
        metrics = {}
        
        t0 = time.time()
        perceived_dom = self.dom_engine.process_elements(raw_dom_elements)
        metrics['dom_ms'] = (time.time() - t0) * 1000
        
        t0 = time.time()
        ocr_findings = self.ocr_engine.extract_visual_text(perceived_dom, screenshot_path)
        metrics['ocr_ms'] = (time.time() - t0) * 1000
        
        vision_boxes = []
        metrics['vision_ms'] = 0
        if screenshot_path:
            t0 = time.time()
            vision_boxes = self.vision_engine.detect_ui_bounding_boxes(screenshot_path) or []
            metrics['vision_ms'] = (time.time() - t0) * 1000
            
        return perceived_dom, ocr_findings, vision_boxes, metrics
