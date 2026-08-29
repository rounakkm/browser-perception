from backend.models.domain import AgentAction
from backend.browser.connector import BrowserConnector
from backend.security.store import value_store
from backend.config.logging import get_logger

logger = get_logger(__name__)

class ActionExecutor:
    def __init__(self, browser: BrowserConnector):
        self.browser = browser

    async def execute(self, action: AgentAction):
        if action.action == "navigate":
            await self.browser.navigate(action.url)
            return

        selector = f"#{action.element_id}"

        if action.action == "click":
            await self.browser.click(selector, timeout=5000)

        elif action.action == "fill":
            value_to_fill = action.value_token
            if value_to_fill and value_to_fill.startswith("[") and value_to_fill.endswith("]"):
                real_value = value_store.get_value(value_to_fill)
                if real_value:
                    value_to_fill = real_value
                else:
                    raise ValueError(f"Invalid token {value_to_fill} provided for fill operation.")

            await self.browser.fill(selector, value_to_fill or "", timeout=5000)

        elif action.action == "submit":
            await self.browser.evaluate(f"document.querySelector('{selector}').submit()")

        elif action.action == "scroll":
            direction = getattr(action, "url", "down")
            await self.browser.evaluate(
                "window.scrollBy(0, 300)" if direction != "up" else "window.scrollBy(0, -300)"
            )

        else:
            logger.warning(f"Unknown action: {action.action}")
