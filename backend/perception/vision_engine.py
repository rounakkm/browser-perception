from typing import List, Optional
from backend.models.domain import VisualElement

class VisionModelPerceptionEngine:
    """
    Plugin interface for future on-device lightweight vision models
    (e.g., ONNX Runtime, WebGPU-based UI element detectors, YOLOV8-UI).
    """
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.is_loaded = False

    def load_model(self):
        """Loads ONNX model into memory if available."""
        self.is_loaded = True

    def detect_ui_bounding_boxes(self, screenshot_path: str) -> List[VisualElement]:
        """Runs visual object detection on webpage screenshots."""
        if not self.is_loaded:
            return []
        return []
