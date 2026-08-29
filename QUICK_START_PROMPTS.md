# Quick Start: Copy-Paste Prompts for Implementation

Use these prompts directly with me or any AI assistant to build each component step-by-step.

---

## Step 1: Create Browser Extension Structure

**Prompt:**
```
I'm building a Chrome/Firefox extension for privacy-preserving browser automation. Create the complete extension structure with Manifest V3:

extension/
├── manifest.json
├── background/service-worker.js
├── content/content.js
├── content/content.css
├── popup/popup.html
├── popup/popup.js
└── modules/capture.js

Requirements:
- Permissions: activeTab, scripting, storage, webNavigation
- Content script runs on all HTTP/HTTPS pages
- Popup UI with: Start/Stop button, Task input field, Status indicator
- Background service worker for WebSocket communication to ws://localhost:8001
- Screenshot capture using chrome.tabs.captureVisibleTab
- Save to extension/ folder in D:\browser-perception
```

---

## Step 2: Implement Screenshot Capture Module

**Prompt:**
```
Create a screenshot capture module for a Chrome extension at:
D:\browser-perception\extension\modules\capture.js

Requirements:
1. Capture visible viewport using chrome.tabs.captureVisibleTab
2. Convert data URI to Canvas for processing
3. Map DOM elements to pixel coordinates
4. Return: {image: base64, width, height, elements: [{id, bbox}]}

Include error handling for:
- Permission denied
- Tab not active
- Image format errors

Export functions: captureViewport(), mapElementsToPixels()
```

---

## Step 3: Build Privacy Filter Module

**Prompt:**
```
Create a privacy filter module at:
D:\browser-perception\extension\modules\privacy.js

Implement these functions:

1. detectPII(elements):
   - Regex patterns for: email, phone (+91 format), Aadhaar, PAN, account numbers
   - Check DOM attributes: type="password", name="email", etc.
   - Return: [{element_id, type, confidence, bbox}]

2. redactRegions(canvas, detections):
   - Apply black rectangles for passwords
   - Gaussian blur (15px radius) for faces (use simple face detection)
   - Pixelation (10px blocks) for text PII
   - Return: {redactedCanvas, metadata}

3. sanitizeScreenshot(base64Image, elements):
   - Combine detection + redaction
   - Return fully sanitized base64 image

Use Canvas API for all redactions. No external libraries for now.
```

---

## Step 4: Create WebSocket Communicator

**Prompt:**
```
Create a WebSocket communication module at:
D:\browser-perception\extension\modules\communicator.js

Requirements:
1. Connect to ws://localhost:8001 on extension load
2. Send message format:
   {
     type: "task_request",
     task: "Fill login form",
     screenshot: "base64...",
     dom_state: {...},
     redaction_metadata: [...]
   }

3. Receive actions:
   {
     action: "click" | "fill" | "scroll" | "navigate",
     element_id: "submit_btn",
     value_token: "[TOKEN_123]",
     reasoning: "..."
   }

4. Handle reconnection (max 3 retries)
5. Timeout after 30 seconds
6. Emit events: onConnect, onMessage, onError, onDisconnect

Use vanilla JavaScript, no frameworks.
```

---

## Step 5: Enhance Backend PII Detector

**Prompt:**
```
Enhance the PII detector at:
D:\browser-perception\backend\pii\detector.py

Add detection for Indian-specific PII:
1. Aadhaar number: XXXX XXXX XXXX (12 digits with spaces)
2. PAN card: [A-Z]{5}[0-9]{4}[A-Z]{1}
3. Indian phone: +91 XXXXX XXXXX or 0XXXXXXXXXX
4. IFSC code: [A-Z]{4}0[A-Z0-9]{7}
5. Driving license: [A-Z]{2}-\d{13}

Add methods:
- detect_aadhaar(text) -> List[Match]
- detect_pan(text) -> List[Match]
- detect_indian_phone(text) -> List[Match]
- analyze_text_content(text) -> List[PIIFinding]

Include confidence scores for each detection type.
```

---

## Step 6: Implement Vision Engine with ONNX

**Prompt:**
```
Implement the vision engine at:
D:\browser-perception\backend\perception\vision_engine.py

Requirements:
1. Load YOLOv8 ONNX model from models/yolov8-ui.onnx
2. Use ONNX Runtime with CUDA/CPU execution provider
3. Preprocess image: resize to 640x640, normalize to [0,1]
4. Run inference and parse output tensor
5. Apply Non-Maximum Suppression (IoU threshold 0.5, conf threshold 0.7)
6. Detect UI elements: button, input, text, image, link
7. Return: List[VisualElement] with bbox and confidence

Add method:
- detect_from_screenshot(image_path: str) -> List[VisualElement]

Include model download script and requirements (onnxruntime, opencv-python, numpy).
```

---

## Step 7: Add OCR Engine with Tesseract

**Prompt:**
```
Implement the OCR engine at:
D:\browser-perception\backend\perception\ocr_engine.py

Requirements:
1. Use pytesseract with Tesseract OCR
2. Extract text from screenshot with bounding boxes
3. Run NER (Named Entity Recognition) using spaCy en_core_web_md
4. Detect PII in extracted text: PERSON, ORG, GPE, MONEY, DATE
5. Correlate OCR text with DOM elements using bbox overlap
6. Return: List[VisualElement] with text_content and ner_tags

Methods:
- extract_text(image_path) -> List[OCRResult]
- detect_pii_entities(text) -> List[NEREntity]
- correlate_with_dom(ocr_results, dom_elements) -> List[DOMElement]

Install: pytesseract, spacy, en_core_web_md model
```

---

## Step 8: Create Server-Side VLM Integration

**Prompt:**
```
Create a Vision-Language Model integration at:
D:\browser-perception\backend\vlm\llava_engine.py

Requirements:
1. Load LLaVA-1.6 model from HuggingFace (liuhaotian/llava-v1.6-mistral-7b)
2. Accept base64 screenshot and DOM state as input
3. Build prompt template:
   "Given this webpage screenshot and available elements:
   {dom_elements}
   
   Task: {task}
   
   Available actions: click(id), fill(id, value), scroll(direction), navigate(url)
   
   Respond in JSON: {reasoning, action, confidence}"

4. Generate response with temperature=0.7, max_tokens=500
5. Parse JSON response and validate action
6. Return: AgentAction object

Include error handling for:
- Model not loaded
- Invalid JSON response
- Timeout (>10 seconds)

Use transformers library. Add GPU support with torch.cuda.
```

---

## Step 9: Build End-to-End Demo Script

**Prompt:**
```
Create a demo script at:
D:\browser-perception\backend\demo\run_e2e_demo.py

Scenario: Bank Login Automation

Steps:
1. Start FastAPI backend on port 8000
2. Launch demo banking webapp on port 8002
3. Open Chrome with extension loaded
4. Navigate to http://localhost:8002/login
5. User clicks extension popup and enters task: "Log into my account"
6. Extension captures screenshot and detects password field
7. Redact password field in screenshot
8. Send to server VLM
9. VLM responds: fill username, fill password (with token), click login
10. Extension executes actions
11. Verify login success

Log:
- Screenshot before/after redaction
- Sanitized DOM state sent to server
- VLM response
- Action execution result
- Total latency

Use Playwright for browser automation. Save logs to demo/logs/
```

---

## Step 10: Performance Benchmarking

**Prompt:**
```
Create a performance benchmark suite at:
D:\browser-perception\backend\tests\performance_benchmark.py

Metrics to measure:
1. Client-side:
   - Screenshot capture time
   - PII detection time
   - Redaction time
   - Model inference time (vision)
   - Memory usage (chrome.performance.memory)

2. Network:
   - Image size before/after redaction
   - WebSocket message size
   - Round-trip latency

3. Server-side:
   - VLM inference time
   - Total request processing time

4. End-to-end:
   - Total task completion time (user input → action executed)
   - Target: <3 seconds

Run 10 iterations and generate report:
- Mean, median, 95th percentile
- Resource utilization graphs
- Bottleneck analysis

Save results to benchmark_results.json
```

---

## Step 11: Create Evaluation Test Suite

**Prompt:**
```
Create evaluation tests for SIH judging criteria at:
D:\browser-perception\backend\tests\evaluation/

1. test_visual_accuracy.py (25%)
   - Test UI element detection accuracy
   - Ground truth: manually annotated bounding boxes
   - Metric: IoU > 0.85

2. test_pii_detection.py (20%)
   - Test precision and recall for PII detection
   - Test dataset: synthetic profiles with known PII
   - Target: Precision > 0.95, Recall > 0.90

3. test_redaction_precision.py (20%)
   - Verify all PII regions are fully covered
   - Check no non-PII regions are over-redacted
   - Visual diff between original and redacted
   - Target: >95% coverage, <5% over-redaction

4. test_resource_utilization.py (20%)
   - Monitor CPU, memory, GPU usage
   - Run under sustained load (10 tasks)
   - Target: Memory < 500MB, CPU < 30%

5. test_latency.py (15%)
   - Measure end-to-end latency for 5 scenarios
   - Report mean, median, 95th percentile
   - Target: <3 seconds

Use pytest. Generate HTML report.
```

---

## Step 12: Documentation & Presentation

**Prompt:**
```
Create project documentation at:
D:\browser-perception\README.md

Include:
1. Project Overview
   - Problem statement
   - Solution architecture
   - Key features

2. Setup Instructions
   - Prerequisites (Python 3.10+, Node.js, Chrome)
   - Backend installation
   - Extension installation
   - Model downloads

3. Usage Guide
   - Starting the server
   - Loading the extension
   - Running demo scenarios
   - Interpreting results

4. Architecture Diagram
   - Client-side flow
   - Server-side flow
   - Data flow diagram

5. Evaluation Results
   - Metrics achieved
   - Performance benchmarks
   - Accuracy scores

6. Demo Video
   - Link to 5-minute walkthrough
   - Key timestamp markers

7. SIH Compliance
   - How each requirement is met
   - Evidence for each criterion

Make it visually appealing with emojis and formatting.
```

---

## Quick Commands to Start

```bash
# 1. Navigate to project
cd D:\browser-perception

# 2. Install backend dependencies
pip install -r requirements.txt

# 3. Download models
python backend/models/download_models.py

# 4. Start backend server
python -m uvicorn backend.api.gateway:app --reload --port 8000

# 5. Start demo webapp
python backend/demo/webapp/app.py

# 6. Load extension in Chrome
# Navigate to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked"
# Select D:\browser-perception\extension

# 7. Run tests
pytest backend/tests/ -v

# 8. Run benchmark
python backend/tests/performance_benchmark.py
```

---

## File Structure After Complete Implementation

```
D:\browser-perception/
├── extension/
│   ├── manifest.json
│   ├── background/
│   │   └── service-worker.js
│   ├── content/
│   │   ├── content.js
│   │   └── content.css
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js
│   ├── modules/
│   │   ├── capture.js
│   │   ├── privacy.js
│   │   ├── vision.js
│   │   └── communicator.js
│   └── lib/
│       └── onnxruntime-web/
├── backend/
│   ├── api/
│   │   └── gateway.py (✓ exists)
│   ├── perception/
│   │   ├── engine.py (✓ exists)
│   │   ├── dom_engine.py (✓ exists)
│   │   ├── ocr_engine.py (needs enhancement)
│   │   └── vision_engine.py (needs implementation)
│   ├── pii/
│   │   └── detector.py (✓ exists, needs enhancement)
│   ├── sanitization/
│   │   └── engine.py (✓ exists)
│   ├── vlm/
│   │   ├── llava_engine.py (new)
│   │   └── prompt_templates.py (new)
│   ├── agents/
│   │   └── task_agent.py (new)
│   ├── demo/
│   │   ├── webapp/ (✓ exists)
│   │   └── run_e2e_demo.py (new)
│   └── tests/
│       ├── performance_benchmark.py (new)
│       └── evaluation/ (new)
├── models/
│   ├── yolov8-ui.onnx
│   ├── blazeface.onnx
│   └── download_models.py
├── requirements.txt (✓ exists, needs update)
├── README.md (new)
└── IMPLEMENTATION_PLAN.md (✓ created)
```

---

## Next Steps

1. **Start with the browser extension** - This is the most critical missing piece
2. **Implement privacy filter** - This is core to the SIH requirements
3. **Set up VLM integration** - This enables the intelligent automation
4. **Build end-to-end demo** - This proves the concept works
5. **Optimize and benchmark** - This ensures it meets performance criteria

Use the prompts above in sequence to build each component. Each prompt is designed to be self-contained and produce working code.
