# On-Device Visual Perception for Browser Agents - Implementation Plan

## Project Overview
Build a privacy-preserving vision agent that runs in the browser, sanitizes PII locally, and communicates with a server-side LLM/VLM for actionable commands.

---

## Phase 1: Browser Extension (Client-Side)

### 1.1 Extension Structure
```
extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── background/
│   └── service-worker.js  # Background script for coordination
├── content/
│   ├── content.js         # DOM extraction & perception
│   └── content.css        # Overlay styles for redaction
├── popup/
│   ├── popup.html         # User interface
│   └── popup.js           # Control panel logic
├── lib/
│   ├── onnxruntime-web/   # ONNX Runtime Web library
│   ├── transformers.js/   # Transformers.js for ViT
│   └── tesseract.js/      # OCR engine
├── models/
│   ├── yolov8-ui.onnx     # UI element detection model
│   └── vit-small.onnx     # Vision Transformer model
└── modules/
    ├── vision.js          # Local vision processing
    ├── privacy.js         # PII detection & redaction
    ├── capture.js         # Screenshot capture
    └── communicator.js    # Server communication
```

### 1.2 Key Components

#### A. Local Vision Processing (vision.js)
**Purpose**: Run lightweight ViT/YOLO model for UI element detection

**Implementation**:
- Use ONNX Runtime Web with WebGPU backend
- Load pre-trained YOLOv8-nano model fine-tuned for UI elements (buttons, inputs, forms)
- Detect interactive elements with bounding boxes
- Confidence threshold: 0.7

**Prompt Format**:
```
Implement a local vision processor using ONNX Runtime Web that:
1. Loads YOLOv8-nano ONNX model (optimized for UI elements)
2. Uses WebGPU for inference acceleration
3. Takes canvas screenshot as input
4. Outputs: [{bbox: [x,y,w,h], label: "button/input/text", confidence: 0.85}]
5. Falls back to WASM if WebGPU unavailable
6. Inference time target: <500ms on mid-range laptop
```

#### B. Privacy-Preserving Filter (privacy.js)
**Purpose**: Detect and redact PII from screenshots before server transmission

**Implementation**:
- Multi-layer detection:
  - DOM-based: Password inputs, fields with sensitive labels
  - Text-based: Regex patterns (email, phone, Aadhaar, PAN)
  - Visual-based: Face detection (using BlazeFace model)
- Redaction methods:
  - Black boxes for password fields
  - Gaussian blur for faces
  - Pixelation for text-based PII regions
  - Semantic masking (replace with "[REDACTED]")

**Prompt Format**:
```
Build a privacy filter module that:
1. Detects PII types:
   - Passwords (DOM type="password")
   - Emails (regex: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})
   - Phone numbers (Indian format: +91-XXXXX-XXXXX)
   - Aadhaar numbers (XXXX XXXX XXXX)
   - PAN cards ([A-Z]{5}[0-9]{4}[A-Z]{1})
   - Faces (use BlazeFace ONNX model)

2. Applies redaction:
   - Passwords: Solid black rectangle
   - Faces: Gaussian blur (kernel size 15x15)
   - Text PII: Pixelation (10px blocks) + "[REDACTED]" label
   - Account numbers: Show only last 4 digits (****1234)

3. Returns:
   - Redacted screenshot (base64)
   - Metadata: [{type: "email", bbox: [...], action: "pixelated"}]
   - Redaction confidence scores
```

#### C. Screenshot Capture (capture.js)
**Purpose**: Capture current tab viewport with sensitive regions identified

**Implementation**:
```javascript
// Use chrome.tabs.captureVisibleTab API
// Or canvas API for full-page screenshots
// Coordinate with content script for DOM element positions
```

**Prompt Format**:
```
Create a screenshot capture module that:
1. Captures current visible viewport (chrome.tabs.captureVisibleTab)
2. Optionally captures full page (scroll + stitch)
3. Converts to canvas for processing
4. Maps DOM elements to pixel coordinates
5. Annotates detected PII regions with bounding boxes
6. Returns: {image: base64, width: 1920, height: 1080, dpi: 1.0}
```

#### D. Server Communicator (communicator.js)
**Purpose**: Send sanitized context to server and execute returned commands

**Implementation**:
- WebSocket connection for real-time interaction
- HTTP fallback for simple queries
- Message format:
  ```json
  {
    "task": "Fill login form",
    "sanitized_screenshot": "data:image/png;base64,...",
    "dom_state": {...},
    "redaction_metadata": [...]
  }
  ```

**Prompt Format**:
```
Build a secure communicator that:
1. Establishes WebSocket connection to server (wss://localhost:8001)
2. Sends sanitized visual context + DOM state
3. Receives action commands:
   - {action: "click", element_id: "submit_btn"}
   - {action: "fill", element_id: "email_input", value_token: "[TOKEN_123]"}
   - {action: "scroll", direction: "down"}
4. Handles reconnection logic
5. Implements request timeout (30s)
6. Validates server responses against DOM state
```

---

## Phase 2: Server-Side Integration

### 2.1 Vision-Language Model Setup

**Options for Server-Side VLM**:
1. **LLaVA-1.6** (Recommended) - Open-source, runs on consumer GPU
2. **Qwen-VL-Chat** - Strong multi-language support
3. **GPT-4V/Gemini Pro Vision** - Cloud APIs (for SIH demo only)

**Implementation**:
```
backend/
├── vlm/
│   ├── llava_engine.py     # LLaVA inference engine
│   ├── qwen_engine.py      # Qwen-VL alternative
│   └── prompt_templates.py # Task-specific prompts
├── agents/
│   └── task_agent.py       # LangChain/LlamaIndex agent
└── cache/
    └── context_cache.py    # Session state management
```

**Prompt Format for VLM**:
```
You are a browser automation agent. Given:
1. A sanitized screenshot (PII redacted)
2. DOM element descriptions
3. User task: "{task_description}"

Available actions:
- click(element_id)
- fill(element_id, value)
- scroll(direction)
- navigate(url)

Output JSON:
{
  "reasoning": "I see a login form with email and password fields...",
  "action": {
    "type": "fill",
    "element_id": "email_input",
    "value": "user@example.com" OR "[TOKEN_XYZ]" if redacted
  },
  "confidence": 0.92
}

Important:
- Respect [REDACTED] tokens - do not attempt to decode
- Use provided element_ids, not visual estimates
- Ask for clarification if task is ambiguous
```

### 2.2 Agent Workflow

```python
# backend/agents/task_agent.py
class BrowserAgent:
    def __init__(self):
        self.vlm = LLaVAEngine()
        self.memory = ConversationBufferMemory()

    async def process_task(self, context: AgentContext):
        # 1. Build prompt with screenshot + DOM
        prompt = self.build_prompt(context)

        # 2. Get VLM response
        response = await self.vlm.generate(prompt)

        # 3. Parse action
        action = self.parse_action(response)

        # 4. Return to client
        return action
```

---

## Phase 3: Enhanced PII Detection

### 3.1 Multi-Modal Detection

**Current**: Regex only
**Required**: Visual + Contextual + ML-based

#### A. Visual Text Detection (OCR + NER)
```
backend/perception/ocr_engine.py:
1. Use Tesseract.js (client) or PaddleOCR (server)
2. Extract text from screenshot regions
3. Run NER model (spaCy or Transformers)
4. Detect: PERSON, ORG, GPE, MONEY, DATE
```

#### B. Contextual Analysis
```
backend/pii/detector.py enhancements:
1. Semantic understanding (field labels + nearby text)
2. Field type inference (login forms → password likely)
3. Pattern correlation (DOB field near age field)
4. Cross-field validation (email appears in multiple places)
```

#### C. Face Detection
```
extension/modules/privacy.js:
1. Load BlazeFace model (2.1MB, runs in <50ms)
2. Detect face bounding boxes
3. Apply Gaussian blur
4. Log detection for audit
```

---

## Phase 4: End-to-End Demo Scenarios

### Scenario 1: Bank Login Automation
**Task**: "Log into my bank account and check balance"

**Flow**:
1. User navigates to bank website
2. Extension captures screenshot → detects password field → redacts
3. Sends to server: {redacted_screenshot, dom_state, task}
4. Server VLM analyzes: "I see login form with username and password fields"
5. Server returns: {action: "fill", element_id: "password", value_token: "[TOKEN_PWD]"}
6. Extension fills password using stored token
7. VLM: "Click login button"
8. Balance page loads → redact account numbers → show to user

### Scenario 2: Form Filling with PII Protection
**Task**: "Fill my profile information"

**Flow**:
1. Detect name, email, phone fields
2. Redact values in screenshot
3. Send tokens: [TOKEN_NAME], [TOKEN_EMAIL], [TOKEN_PHONE]
4. Server doesn't know actual values
5. Extension fills from local secure store

---

## Phase 5: Performance Optimization

### 5.1 Latency Reduction
- Model quantization (INT8 for ONNX)
- WebGL batching for vision inference
- WebSocket connection pooling
- Client-side caching of DOM state

### 5.2 Resource Utilization
```
Metrics to track:
- Memory: <500MB for extension
- CPU: <30% during inference
- GPU: WebGPU utilization monitoring
- Network: <5MB per sanitized screenshot
```

### 5.3 Benchmarking Script
```python
# backend/tests/performance_benchmark.py
def measure_latency():
    # Capture → Sanitize → Send → Action cycle
    start = time.time()
    context = capture_state()
    sanitized = sanitize(context)
    action = server_process(sanitized)
    execute(action)
    return time.time() - start

# Target: <3s end-to-end latency
```

---

## Phase 6: Evaluation Metrics Implementation

### 6.1 Visual Context Accuracy (25%)
```python
# backend/tests/test_visual_accuracy.py
def test_ui_element_detection():
    # Ground truth: manually annotated bounding boxes
    # Predicted: model output
    # Metric: IoU (Intersection over Union)
    # Target: >0.85 mean IoU
```

### 6.2 PII Detection Recall/Precision (20%)
```python
# backend/tests/test_pii_detection.py
def test_pii_metrics():
    # Precision = TP / (TP + FP)
    # Recall = TP / (TP + FN)
    # Test on synthetic dataset with known PII
    # Target: Precision > 0.95, Recall > 0.90
```

### 6.3 Redaction Precision (20%)
```python
# backend/tests/test_redaction.py
def test_redaction_quality():
    # Check: all PII regions covered
    # Check: minimal non-PII redaction
    # Check: text still readable
    # Target: >95% coverage, <5% over-redaction
```

### 6.4 Resource Monitoring (20%)
```javascript
// extension/modules/monitor.js
chrome.performance.memory.usedJSHeapSize
// Track GPU memory via WebGPU API
// Log to background script
```

### 6.5 End-to-End Latency (15%)
```python
# Instrument entire pipeline
# Log timestamps at each stage
# Generate performance report
```

---

## Implementation Priority Order

### Week 1: Core Extension
1. ✅ Browser extension manifest & structure
2. ✅ Screenshot capture module
3. ✅ Basic privacy filter (DOM-based)
4. ✅ WebSocket communicator

### Week 2: Vision & Detection
5. ✅ ONNX model integration (YOLOv8-UI)
6. ✅ OCR integration (Tesseract.js)
7. ✅ Advanced PII detection (regex + NER)
8. ✅ Face detection & blurring

### Week 3: Server-Side
9. ✅ VLM setup (LLaVA/Qwen)
10. ✅ Agent prompt engineering
11. ✅ Action planning logic
12. ✅ End-to-end integration

### Week 4: Testing & Polish
13. ✅ Performance benchmarking
14. ✅ Accuracy evaluation
15. ✅ Demo scenario scripts
16. ✅ Documentation & video

---

## Prompt Templates for Development

### Prompt 1: Extension Manifest
```
Create a Chrome Extension Manifest V3 file for a privacy-preserving browser agent that needs:
- Active tab access for screenshots
- Scripting API for DOM manipulation
- Storage API for secure token vault
- WebGPU access for on-device inference
- WebSocket connections to localhost:8001
- Content scripts on all HTTP/HTTPS pages
- Popup UI for user control

Include permissions: activeTab, script, storage, webNavigation
```

### Prompt 2: ONNX Vision Module
```
Implement a JavaScript module using ONNX Runtime Web that:
1. Loads YOLOv8-nano model from /models/yolov8-ui.onnx
2. Initializes WebGPU execution provider
3. Preprocesses screenshot: resize to 640x640, normalize to [0,1]
4. Runs inference and parses output tensor
5. Applies Non-Maximum Suppression (IoU threshold 0.5)
6. Returns detected UI elements with bounding boxes
7. Handles errors gracefully with WASM fallback
8. Target inference time: <500ms on M1 Macbook Air
```

### Prompt 3: Privacy Filter with Face Detection
```
Build a privacy module that processes screenshots to redact sensitive information:
1. Load BlazeFace model (face detection)
2. Run face detection on input image
3. For each detected face, apply Gaussian blur (radius: 15px)
4. Detect text regions using canvas OCR
5. Apply regex patterns: email, phone (Indian format), Aadhaar, PAN
6. For text matches, pixelate region (10px blocks)
7. Return: {redactedImage: base64, detections: [{type, bbox, confidence}]}
8. Ensure redaction is irreversible (no watermarking)
```

### Prompt 4: Server-Side VLM Integration
```
Create a FastAPI endpoint that:
1. Accepts POST request with:
   - base64 sanitized screenshot
   - DOM element JSON
   - task description string
2. Decodes image and converts to RGB tensor
3. Loads LLaVA-1.6 model from HuggingFace
4. Builds prompt: "Given this webpage screenshot and available elements, {task}"
5. Generates response with beam search (num_beams=3)
6. Parses action from JSON response
7. Returns: {action: {...}, reasoning: "...", confidence: 0.92}
8. Handles timeouts (max 10s inference)
```

### Prompt 5: End-to-End Demo Script
```
Write a Playwright test script that:
1. Launches browser with extension loaded
2. Navigates to http://localhost:8000/login (test banking app)
3. Triggers extension via popup: "Fill login form"
4. Verifies:
   - Screenshot was captured
   - Password field was redacted in transmitted image
   - Server received sanitized context
   - Action was executed correctly
   - Login succeeded
5. Measures and logs latency at each step
6. Takes comparison screenshots (before/after redaction)
```

---

## Evaluation Checklist

- [ ] Extension loads in Chrome/Firefox
- [ ] Screenshot capture works on any website
- [ ] PII detection accuracy >95% on test dataset
- [ ] Face detection works on diverse skin tones
- [ ] Redaction is visually complete (no leakage)
- [ ] ONNX model inference <500ms
- [ ] WebSocket communication stable
- [ ] Server VLM returns valid actions
- [ ] Actions execute correctly in browser
- [ ] End-to-end latency <3 seconds
- [ ] Memory usage <500MB
- [ ] Works on 3 demo scenarios:
  - [ ] Bank login
  - [ ] Profile form filling
  - [ ] E-commerce checkout

---

## Resources

### Models
- YOLOv8-nano (UI): https://github.com/HCIILAB/UI-Detection-YOLOv8
- BlazeFace: https://tfhub.dev/tensorflow/blazeface/1
- LLaVA-1.6: https://huggingface.co/liuhaotian/llava-v1.6-mistral-7b
- spaCy NER: https://spacy.io/models/en#en_core_web_md

### Libraries
- ONNX Runtime Web: https://github.com/microsoft/onnxruntime
- Transformers.js: https://huggingface.co/docs/transformers.js
- Tesseract.js: https://github.com/naptha/tesseract.js
- Playwright: https://playwright.dev/python/docs/intro

### References
- WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- Chrome Extension Manifest V3: https://developer.chrome.com/docs/extensions/mv3/intro/
- Privacy-Preserving ML: https://arxiv.org/abs/2308.00123
