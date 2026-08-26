from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DOMElement(BaseModel):
    element_id: str
    type: str
    role: Optional[str] = None
    label: Optional[str] = None
    value: Optional[str] = None
    text: Optional[str] = None
    bbox: Optional[List[int]] = None # [x, y, width, height]
    attributes: Dict[str, str] = Field(default_factory=dict)
    is_interactive: bool = False

class VisualElement(BaseModel):
    bbox: List[int]
    text_content: Optional[str] = None
    confidence: float = 1.0

class PageState(BaseModel):
    url: str
    title: str
    screenshot_path: Optional[str] = None
    dom_elements: List[DOMElement]
    viewport: Dict[str, int]
    timestamp: float

class PIIFinding(BaseModel):
    element_id: str
    category: str
    confidence: float
    source: str
    value: str

class SanitizedElement(BaseModel):
    element_id: str
    type: str
    role: Optional[str] = None
    label: Optional[str] = None
    value: Optional[str] = None
    text: Optional[str] = None
    bbox: Optional[List[int]] = None
    is_interactive: bool = False
    sensitive: bool = False

class SanitizedPageState(BaseModel):
    url: str
    title: str
    elements: List[SanitizedElement]
    viewport: Dict[str, int]
    timestamp: float

class AgentContext(BaseModel):
    task: str
    page: SanitizedPageState

class AgentAction(BaseModel):
    action: str # "click", "fill", "scroll", "navigate", "submit"
    element_id: Optional[str] = None
    value_token: Optional[str] = None
    url: Optional[str] = None # For navigation

class ActionResult(BaseModel):
    success: bool
    error: Optional[str] = None
    new_state: Optional[SanitizedPageState] = None
