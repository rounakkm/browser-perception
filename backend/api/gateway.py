from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from backend.models.domain import AgentContext, AgentAction, ActionResult, SanitizedPageState
from backend.browser.connector import BrowserConnector
from backend.capture.service import CaptureService
from backend.sanitization.engine import SanitizationEngine
from backend.actions.validator import ActionValidator
from backend.actions.executor import ActionExecutor
from backend.config.settings import settings
from backend.config.logging import setup_logging, get_logger
import asyncio
import time
import traceback
from typing import Dict, Any

# Initialize logging
logger = get_logger(__name__)

app = FastAPI(
    title="Browser Perception API",
    description="On-device Visual Perception for Browser Agents",
    version="1.0.0"
)

# Global state
browser: BrowserConnector = None
capture_service: CaptureService = None
sanitizer: SanitizationEngine = None
action_validator: ActionValidator = None
action_executor: ActionExecutor = None
current_sanitized_state: SanitizedPageState = None
startup_time: float = None

@app.on_event("startup")
async def startup_event():
    global browser, capture_service, sanitizer, action_validator, action_executor, startup_time

    setup_logging()
    startup_time = time.time()
    logger.info("Starting Browser Perception API...")

    try:
        settings.ensure_directories()
        logger.info(f"Configuration loaded - Device: {settings.get_device()}")

        browser = BrowserConnector()
        capture_service = CaptureService(browser)
        sanitizer = SanitizationEngine()
        action_validator = ActionValidator()
        action_executor = ActionExecutor(browser)

        await browser.start()
        logger.info("Browser instance initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize browser: {e}\n{traceback.format_exc()}")
        raise

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
async def get_context(task: str):
    """
    Captures the current browser state, sanitizes it, and returns the context to the agent.
    """
    global current_sanitized_state

    try:
        logger.info(f"Capturing context for task: {task}")

        # Capture raw state
        raw_state = await capture_service.capture_state()
        logger.debug(f"Captured {len(raw_state.dom_elements)} DOM elements")

        # Sanitize
        sanitized_state = sanitizer.sanitize(raw_state)
        current_sanitized_state = sanitized_state

        logger.info(f"Context captured successfully - URL: {sanitized_state.url}")

        return AgentContext(
            task=task,
            page=sanitized_state
        )
    except Exception as e:
        logger.error(f"Failed to capture context: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to capture context: {str(e)}")

@app.post("/agent/action", response_model=ActionResult)
async def perform_action(action: AgentAction):
    """
    Receives an action from the agent, validates it against the current sanitized state,
    and executes it locally.
    """
    global current_sanitized_state

    logger.info(f"Received action: {action.action} on element: {action.element_id}")

    if not current_sanitized_state and action.action != "navigate":
        logger.warning("No active context available")
        raise HTTPException(status_code=400, detail="No active context. Request context first or navigate.")

    try:
        # Validate action
        if action.action != "navigate":
            try:
                action_validator.validate(action, current_sanitized_state)
                logger.debug("Action validation passed")
            except ValueError as validation_error:
                logger.warning(f"Action validation failed: {validation_error}")
                return ActionResult(success=False, error=str(validation_error))

        # Execute action
        await action_executor.execute(action)
        logger.info(f"Action {action.action} executed successfully")

        # Wait for page to stabilize
        await asyncio.sleep(1.0)

        # Capture new state
        raw_state = await capture_service.capture_state()
        sanitized_state = sanitizer.sanitize(raw_state)
        current_sanitized_state = sanitized_state

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
