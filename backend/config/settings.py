from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    AGENT_ENDPOINT: Optional[str] = "http://localhost:8001/agent/action"
    BROWSER_HEADLESS: bool = True
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000
    HOST: str = "127.0.0.1"

    MODEL_DIR: str = "models"
    YOLO_MODEL_PATH: str = "models/yolov8-ui.onnx"
    BLAZEFACE_MODEL_PATH: str = "models/blazeface.onnx"

    VISION_CONFIDENCE_THRESHOLD: float = 0.7
    VISION_IOU_THRESHOLD: float = 0.5
    VISION_INPUT_SIZE: int = 640

    OCR_ENABLED: bool = True
    NER_ENABLED: bool = True

    PII_DETECTION_ENABLED: bool = True
    DEFAULT_SANITIZATION: bool = True

    MAX_CONCURRENT_REQUESTS: int = 10
    REQUEST_TIMEOUT: int = 30
    INFERENCE_TIMEOUT: int = 10

    DEVICE: str = "auto"

    SCREENSHOT_DIR: str = "screenshots"
    SCREENSHOT_QUALITY: int = 85

    DEMO_WEBAPP_PORT: int = 8002
    ENABLE_DEMO_SCENARIOS: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def get_device(self) -> str:
        """Get the device to use for inference."""
        if self.DEVICE == "auto":
            try:
                import torch
                if torch.cuda.is_available():
                    return "cuda"
            except ImportError:
                pass
            return "cpu"
        return self.DEVICE

    def ensure_directories(self):
        """Ensure required directories exist."""
        os.makedirs(self.MODEL_DIR, exist_ok=True)
        os.makedirs(self.SCREENSHOT_DIR, exist_ok=True)

settings = Settings()
