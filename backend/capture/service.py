from typing import Optional
from backend.models.domain import PageState
from backend.browser.connector import BrowserConnector
from backend.perception.engine import PerceptionEngine
import time

class CaptureService:
    def __init__(self, browser: BrowserConnector):
        self.browser = browser
        self.perception = PerceptionEngine()

    async def capture_state(self) -> PageState:
        url = await self.browser.get_url()
        title = await self.browser.get_title()
        viewport = await self.browser.get_viewport()
        

        screenshot_path = None
        
        
        raw_dom_elements = await self.browser.extract_dom_elements()
        
       
        perceived_elements = self.perception.perceive(raw_dom_elements, screenshot_path)
        
        return PageState(
            url=url,
            title=title,
            screenshot_path=screenshot_path,
            dom_elements=perceived_elements,
            viewport=viewport,
            timestamp=time.time()
        )
