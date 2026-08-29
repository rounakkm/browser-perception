from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.models.domain import (
    AgentContext, AgentAction, ActionResult, SanitizedPageState,
    DashboardState, ProcessingMetrics, BrowserPerceptionRequest,
    BrowserActionResult, ExtensionAction
)
from backend.browser.connector import BrowserConnector
from backend.browser.extension_bridge import ExtensionBridge
from backend.capture.service import CaptureService
from backend.sanitization.engine import SanitizationEngine
from backend.actions.validator import ActionValidator
from backend.actions.executor import ActionExecutor
from backend.config.settings import settings
from backend.config.logging import setup_logging, get_logger
from backend.security.origin_policy import origin_decision
from backend.security.store import value_store
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import time
import traceback
import os
from typing import Dict, Any

# Initialize logging
logger = get_logger(__name__)

app = FastAPI(
    title="Browser Perception API",
    description="On-device Visual Perception for Browser Agents",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
browser: BrowserConnector = None
capture_service: CaptureService = None
sanitizer: SanitizationEngine = SanitizationEngine()
action_validator: ActionValidator = ActionValidator()
action_executor: ActionExecutor = None
current_sanitized_state: SanitizedPageState = None
latest_dashboard_state: DashboardState = None
startup_time: float = None
browser_lock: asyncio.Lock = asyncio.Lock()
extension_bridge: ExtensionBridge = ExtensionBridge()


async def _do_capture():
    """Shared helper: capture current browser state and update global dashboard state."""
    global current_sanitized_state, latest_dashboard_state
    raw_state, ocr_findings, vision_boxes, metrics = await capture_service.capture_state()
    t0 = time.time()
    sanitized_state = sanitizer.sanitize(raw_state)
    metrics['sanitization_ms'] = (time.time() - t0) * 1000
    metrics['total_ms'] = sum(metrics.values())
    current_sanitized_state = sanitized_state
    screenshot_url = f"/screenshots/{os.path.basename(raw_state.screenshot_path)}" if raw_state.screenshot_path else None
    latest_dashboard_state = DashboardState(
        url=raw_state.url,
        title=raw_state.title,
        screenshot_url=screenshot_url,
        raw_elements=raw_state.dom_elements,
        sanitized_elements=sanitized_state.elements,
        ocr_results=ocr_findings,
        vision_results=vision_boxes,
        metrics=ProcessingMetrics(**metrics),
        viewport=raw_state.viewport,
        timestamp=raw_state.timestamp
    )
    return raw_state, sanitized_state


@app.on_event("startup")
async def startup_event():
    global browser, capture_service, sanitizer, action_validator, action_executor, startup_time

    setup_logging()
    startup_time = time.time()
    logger.info("Starting Browser Perception API...")

    try:
        settings.ensure_directories()
        app.mount("/screenshots", StaticFiles(directory=settings.SCREENSHOT_DIR), name="screenshots")
        logger.info(f"Configuration loaded - Device: {settings.get_device()}")

        browser = BrowserConnector()
        capture_service = CaptureService(browser)
        sanitizer = SanitizationEngine()
        action_validator = ActionValidator()
        action_executor = ActionExecutor(browser)

        await browser.start()
        if browser._is_started:
            logger.info("Browser instance initialized successfully")
            # Auto-capture on startup so dashboard has live data immediately
            try:
                await browser.navigate("https://www.google.com")
                await asyncio.sleep(2.0)
                await _do_capture()
                logger.info("Auto-capture on startup complete")
            except Exception as cap_err:
                logger.warning(f"Auto-capture failed (non-fatal): {cap_err}")
        else:
            logger.warning("Browser failed to start - server running in extension-only mode (no Playwright capture)")
    except Exception as e:
        logger.error(f"Startup error (non-fatal): {e}\n{traceback.format_exc()}")


@app.on_event("shutdown")
async def shutdown_event():
    global browser
    logger.info("Shutting down Browser Perception API...")
    if browser:
        await browser.stop()
    logger.info("Shutdown complete")


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    uptime = time.time() - startup_time if startup_time else 0
    browser_status = "healthy" if browser and browser._page else "not_initialized"

    return {
        "status": "healthy",
        "uptime_seconds": uptime,
        "browser_status": browser_status,
        "version": "1.0.0"
    }


@app.get("/config")
async def get_config() -> Dict[str, Any]:
    """Get current configuration (safe values only)."""
    return {
        "device": settings.get_device(),
        "ocr_enabled": settings.OCR_ENABLED,
        "ner_enabled": settings.NER_ENABLED,
        "pii_detection_enabled": settings.PII_DETECTION_ENABLED,
        "vision_confidence_threshold": settings.VISION_CONFIDENCE_THRESHOLD,
        "browser_headless": settings.BROWSER_HEADLESS,
    }


@app.post("/agent/context", response_model=AgentContext)
async def get_context(task: str, session_id: str | None = None):
    """
    Captures the current browser state, sanitizes it, and returns the context to the agent.
    """
    global current_sanitized_state, latest_dashboard_state

    try:
        logger.info(f"Capturing context for task: {task}")

        extension_session = session_id or extension_bridge.active_session_id()
        extension_record = extension_bridge.get_session(extension_session) if extension_session else None
        sanitized_state = extension_record.state if extension_record else None
        if session_id and not extension_record:
            raise HTTPException(status_code=404, detail="No sanitized state for requested browser session")

        if sanitized_state is None:
            # Fall back to Playwright capture
            async with browser_lock:
                raw_state, ocr_findings, vision_boxes, metrics = await capture_service.capture_state()
                logger.debug(f"Captured {len(raw_state.dom_elements)} DOM elements")

                t0 = time.time()
                sanitized_state = sanitizer.sanitize(raw_state)
                metrics['sanitization_ms'] = (time.time() - t0) * 1000
                metrics['total_ms'] = sum(metrics.values())

                # Update dashboard state so the UI shows live data
                screenshot_url = f"/screenshots/{os.path.basename(raw_state.screenshot_path)}" if raw_state.screenshot_path else None
                latest_dashboard_state = DashboardState(
                    url=raw_state.url,
                    title=raw_state.title,
                    screenshot_url=screenshot_url,
                    raw_elements=raw_state.dom_elements,
                    sanitized_elements=sanitized_state.elements,
                    ocr_results=ocr_findings,
                    vision_results=vision_boxes,
                    metrics=ProcessingMetrics(**metrics),
                    viewport=raw_state.viewport,
                    timestamp=raw_state.timestamp
                )

        current_sanitized_state = sanitized_state
        logger.info(f"Context captured successfully - URL: {sanitized_state.url}")

        return AgentContext(
            task=task,
            page=sanitized_state,
            session_id=extension_session if extension_record else None,
            page_revision=extension_record.page_revision if extension_record else None,
        )
    except Exception as e:
        logger.error(f"Failed to capture context: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to capture context: {str(e)}")


@app.post("/agent/action", response_model=ActionResult)
async def perform_action(action: AgentAction):
    """
    Receives an action from the agent, validates it against the current sanitized state,
    and executes it locally or queues it for the Chrome extension.
    """
    global current_sanitized_state

    logger.info(f"Received action: {action.action} on element: {action.element_id}")

    if not current_sanitized_state and action.action != "navigate":
        logger.warning("No active context available")
        raise HTTPException(status_code=400, detail="No active context. Request context first or navigate.")

    try:
        session_id = action.session_id or extension_bridge.active_session_id()
        session = extension_bridge.get_session(session_id) if session_id else None

        if session:
            if not action.session_id or action.page_revision is None:
                return ActionResult(success=False, error="Extension actions require session_id and page_revision.")
            if action.page_revision != session.page_revision:
                return ActionResult(success=False, error="Stale action: request a fresh sanitized page context.")
            if action.action == "navigate":
                return ActionResult(success=False, error="Extension agents may not navigate to a new origin; activate that origin explicitly.")
            if action.action not in {"click", "fill", "submit"}:
                return ActionResult(success=False, error="Action is not supported by the extension execution policy.")
            
            resolved_value = action.value
            if action.value_token and action.value_token.startswith("["):
                resolved_value = value_store.get_value(action.value_token, session_id)
                if resolved_value is None:
                    raise ValueError("Invalid or expired sensitive value token.")
            
            try:
                action_validator.validate(action, session.state, scope_id=session_id)
            except ValueError as validation_error:
                logger.warning(f"Action validation failed: {validation_error}")
                return ActionResult(success=False, error=str(validation_error))

            extension_bridge.enqueue(session_id, action=action.action,
                                    element_id=action.element_id, value=resolved_value, url=action.url)
            logger.info("Queued validated action for local Chrome extension")
            return ActionResult(success=True, new_state=current_sanitized_state)

        async with browser_lock:
            if action.action != "navigate":
                try:
                    action_validator.validate(action, current_sanitized_state)
                    logger.debug("Action validation passed")
                except ValueError as validation_error:
                    logger.warning(f"Action validation failed: {validation_error}")
                    return ActionResult(success=False, error=str(validation_error))

            await action_executor.execute(action)
            logger.info(f"Action {action.action} executed successfully")

            await asyncio.sleep(1.0)

            raw_state, ocr_findings, vision_boxes, metrics = await capture_service.capture_state()
            
            t0 = time.time()
            sanitized_state = sanitizer.sanitize(raw_state)
            metrics['sanitization_ms'] = (time.time() - t0) * 1000
            metrics['total_ms'] = sum(metrics.values())
            
            current_sanitized_state = sanitized_state
            
            global latest_dashboard_state
            screenshot_url = f"/screenshots/{os.path.basename(raw_state.screenshot_path)}" if raw_state.screenshot_path else None
            latest_dashboard_state = DashboardState(
                url=raw_state.url,
                title=raw_state.title,
                screenshot_url=screenshot_url,
                raw_elements=raw_state.dom_elements,
                sanitized_elements=sanitized_state.elements,
                ocr_results=ocr_findings,
                vision_results=vision_boxes,
                metrics=ProcessingMetrics(**metrics),
                viewport=raw_state.viewport,
                timestamp=raw_state.timestamp
            )

            logger.info("New state captured after action execution")

            return ActionResult(
                success=True,
                new_state=sanitized_state
            )

    except ValueError as e:
        logger.error(f"Value error during action execution: {e}")
        return ActionResult(success=False, error=str(e))
    except Exception as e:
        logger.error(f"Internal execution error: {e}\n{traceback.format_exc()}")
        return ActionResult(success=False, error=f"Internal execution error: {str(e)}")


@app.post("/browser/perception", response_model=SanitizedPageState)
async def receive_browser_perception(request: BrowserPerceptionRequest):
    """Trusted extension ingress. Raw DOM is sanitized before it can be read by an agent."""
    global current_sanitized_state
    try:
        allowed, reason = origin_decision(request.page.url)
        if not allowed:
            raise HTTPException(status_code=403, detail=reason)
        sanitized_state = sanitizer.sanitize(request.page, scope_id=request.session_id)
        extension_bridge.save_state(request.session_id, sanitized_state)
        current_sanitized_state = sanitized_state
        logger.info("Received and sanitized extension page state (%d elements)",
                    len(sanitized_state.elements))
        return sanitized_state
    except Exception as e:
        logger.error("Failed to sanitize extension page state: %s", e)
        raise HTTPException(status_code=400, detail="Invalid browser perception payload")


@app.get("/browser/state/{session_id}", response_model=SanitizedPageState)
async def browser_sanitized_state(session_id: str):
    """Safe inspection endpoint; it deliberately has no raw-DOM counterpart."""
    state = extension_bridge.get_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="No sanitized state for session")
    return state


@app.get("/browser/actions/next")
async def next_browser_action(session_id: str):
    action = extension_bridge.next_action(session_id)
    if not action:
        return Response(status_code=204)
    return action


@app.post("/browser/actions/result")
async def browser_action_result(result: BrowserActionResult):
    extension_bridge.record_result(result.action_id, result.success)
    if not result.success:
        logger.warning("Chrome extension reported action failure: %s", result.error or "unspecified")
    return {"ok": True}


@app.get("/dashboard/state", response_model=DashboardState)
async def get_dashboard_state():
    """Endpoint for the UI to retrieve the latest full perception state."""
    if not latest_dashboard_state:
        # Return a default empty state so the dashboard shows ONLINE instead of erroring
        return DashboardState(
            url="",
            title="Waiting for first capture...",
            screenshot_url=None,
            raw_elements=[],
            sanitized_elements=[],
            ocr_results=[],
            vision_results=[],
            metrics=ProcessingMetrics(),
            viewport={"width": 0, "height": 0},
            timestamp=time.time()
        )
    return latest_dashboard_state


@app.get("/dashboard/logs")
async def get_dashboard_logs(limit: int = 500):
    """Endpoint for the UI to stream terminal logs."""
    log_file = "logs/perception.log"
    if not os.path.exists(log_file):
        return {"logs": []}
        
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
        return {"logs": lines[-limit:]}
    except Exception as e:
        logger.error(f"Error reading logs: {e}")
        return {"logs": [f"Error reading logs: {str(e)}"]}


@app.post("/capture")
async def trigger_capture(url: str | None = None):
    """
    Dashboard button: optionally navigate to a URL, take a screenshot, update dashboard state.
    """
    if not browser or not browser._is_started:
        raise HTTPException(status_code=503, detail="Browser not available. Restart the server.")
    try:
        async with browser_lock:
            if url:
                await browser.navigate(url)
                logger.info(f"Navigated to: {url}")
                await asyncio.sleep(1.5)  # Let page settle/render
            raw_state, sanitized_state = await _do_capture()
            logger.info(f"Capture complete — URL: {raw_state.url}, elements: {len(raw_state.dom_elements)}")
            return {"ok": True, "url": raw_state.url, "elements": len(raw_state.dom_elements)}
    except Exception as e:
        logger.error(f"Capture failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


