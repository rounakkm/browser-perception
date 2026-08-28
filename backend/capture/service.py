from typing import Optional
from backend.models.domain import PageState
from backend.browser.connector import BrowserConnector
from backend.perception.engine import PerceptionEngine
from backend.config.settings import settings
from backend.config.logging import get_logger
import time
import os

logger = get_logger(__name__)

class CaptureService:
    def __init__(self, browser: BrowserConnector):
        self.browser = browser
        self.perception = PerceptionEngine()

    async def capture_state(self) -> PageState:
        """Capture the current page state including screenshot and DOM."""
        url = await self.browser.get_url()
        title = await self.browser.get_title()
        viewport = await self.browser.get_viewport()

        screenshot_path = None
        try:
            settings.ensure_directories()
            timestamp = int(time.time() * 1000)
            screenshot_filename = f"screenshot_{timestamp}.png"
            screenshot_path = os.path.join(settings.SCREENSHOT_DIR, screenshot_filename)

            await self.browser.screenshot(screenshot_path)
            logger.debug(f"Screenshot captured: {screenshot_path}")
        except Exception as e:
            logger.warning(f"Failed to capture screenshot: {e}")
            screenshot_path = None

        try:
            raw_dom_elements = await self.browser.extract_dom_elements()
            logger.debug(f"Extracted {len(raw_dom_elements)} DOM elements")
        except Exception as e:
            logger.error(f"Failed to extract DOM elements: {e}")
            raw_dom_elements = []

        try:
            perceived_elements = self.perception.perceive(raw_dom_elements, screenshot_path)
        except Exception as e:
            logger.warning(f"Perception pipeline encountered an issue: {e}")
            perceived_elements = raw_dom_elements

        return PageState(
            url=url,
            title=title,
            screenshot_path=screenshot_path,
            dom_elements=perceived_elements,
            viewport=viewport,
            timestamp=time.time()
        )
