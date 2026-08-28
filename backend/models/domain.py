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
    session_id: Optional[str] = None
    page_revision: Optional[int] = None

class AgentAction(BaseModel):
    action: str # "click", "fill", "scroll", "navigate", "submit"
    element_id: Optional[str] = None
    # Plain values are only valid for non-sensitive fields.  value_token is the
    # only agent-visible reference to a sensitive value.
    value: Optional[str] = None
    value_token: Optional[str] = None
    url: Optional[str] = None # For navigation
    session_id: Optional[str] = None
    page_revision: Optional[int] = None

class ActionResult(BaseModel):
    success: bool
    error: Optional[str] = None
    new_state: Optional[SanitizedPageState] = None

class BrowserPerceptionRequest(BaseModel):
    """Raw browser data accepted only from the local extension boundary."""
    session_id: str
    page: PageState

class BrowserActionResult(BaseModel):
    session_id: str
    action_id: str
    success: bool
    error: Optional[str] = None

class ExtensionAction(BaseModel):
    """Action sent from the trusted backend to the extension, never the agent."""
    action_id: str
    action: str
    element_id: Optional[str] = None
    value: Optional[str] = None
    url: Optional[str] = None


class ProcessingMetrics(BaseModel):
    capture_ms: float = 0
    dom_ms: float = 0
    ocr_ms: float = 0
    vision_ms: float = 0
    sanitization_ms: float = 0
    total_ms: float = 0

class DashboardState(BaseModel):
    url: str
    title: str
    screenshot_url: Optional[str] = None
    raw_elements: List[DOMElement] = Field(default_factory=list)
    sanitized_elements: List[SanitizedElement] = Field(default_factory=list)
    ocr_results: List[VisualElement] = Field(default_factory=list)
    vision_results: List[VisualElement] = Field(default_factory=list)
    metrics: ProcessingMetrics = Field(default_factory=ProcessingMetrics)
    viewport: Dict[str, int]
    timestamp: float
