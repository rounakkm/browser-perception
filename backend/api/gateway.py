from fastapi import FastAPI, HTTPException, BackgroundTasks
from backend.models.domain import AgentContext, AgentAction, ActionResult, SanitizedPageState
from backend.browser.connector import BrowserConnector
from backend.capture.service import CaptureService
from backend.sanitization.engine import SanitizationEngine
from backend.actions.validator import ActionValidator
from backend.actions.executor import ActionExecutor
import asyncio

app = FastAPI(title="On-device Local Perception Middleware")


browser = BrowserConnector()
capture_service = CaptureService(browser)
sanitizer = SanitizationEngine()
action_validator = ActionValidator()
action_executor = ActionExecutor(browser)


current_sanitized_state: SanitizedPageState = None

@app.on_event("startup")
async def startup_event():
    await browser.start()

@app.on_event("shutdown")
async def shutdown_event():
    await browser.stop()

@app.post("/agent/context", response_model=AgentContext)
async def get_context(task: str):
    """
    Captures the current browser state, sanitizes it, and returns the context to the agent.
    """
    global current_sanitized_state
    
   
    raw_state = await capture_service.capture_state()
    

    sanitized_state = sanitizer.sanitize(raw_state)
    current_sanitized_state = sanitized_state
    
    return AgentContext(
        task=task,
        page=sanitized_state
    )

@app.post("/agent/action", response_model=ActionResult)
async def perform_action(action: AgentAction):
    """
    Receives an action from the agent, validates it against the current sanitized state,
    and executes it locally.
    """
    global current_sanitized_state
    
    if not current_sanitized_state and action.action != "navigate":
        raise HTTPException(status_code=400, detail="No active context. Request context first or navigate.")
        
    try:
      
        if action.action != "navigate":
            action_validator.validate(action, current_sanitized_state)
            
     
        await action_executor.execute(action)
        
       
        await asyncio.sleep(1.0)
        raw_state = await capture_service.capture_state()
        sanitized_state = sanitizer.sanitize(raw_state)
        current_sanitized_state = sanitized_state
        
        return ActionResult(
            success=True,
            new_state=sanitized_state
        )
        
    except ValueError as e:
        return ActionResult(success=False, error=str(e))
    except Exception as e:
        return ActionResult(success=False, error=f"Internal execution error: {str(e)}")
