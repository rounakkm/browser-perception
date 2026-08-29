import sys
import asyncio

# Must be set before ANY asyncio event loop is created.
# Uvicorn's reloader spawns a fresh subprocess on Windows which defaults to
# SelectorEventLoop – that loop does NOT support subprocesses (Playwright needs
# create_subprocess_exec). Forcing ProactorEventLoop here, at module-import
# time, fixes the issue regardless of how the process was started.
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from backend.models.domain import DOMElement
from backend.config.settings import settings
from backend.config.logging import get_logger

logger = get_logger(__name__)

class BrowserConnector:
    """
    Browser connector using Playwright Async API.
    Fully compatible with FastAPI/uvicorn asyncio event loop.
    """

    def __init__(self):
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._is_started = False

    async def start(self, headless: Optional[bool] = None):
        """Initialize the browser using async Playwright."""
        if self._is_started:
            return
        if headless is None:
            headless = settings.BROWSER_HEADLESS

        try:
            self._playwright = await async_playwright().start()

            self._browser = await self._playwright.chromium.launch(
                headless=headless,
                args=["--start-maximized", "--disable-infobars", "--no-sandbox"]
            )
            self._context = await self._browser.new_context()
            self._page = await self._context.new_page()
            self._is_started = True
            logger.info("Browser started successfully (async Playwright)")
        except Exception as e:
            logger.error(f"Failed to start browser: {e}")
            self._is_started = False
            # Don't re-raise – let the server start without a browser.
            # Browser will be lazily re-attempted on first capture request.

    async def stop(self):
        """Stop the browser."""
        try:
            if self._page:
                await self._page.close()
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
            logger.info("Browser stopped")
        except Exception as e:
            logger.warning(f"Error stopping browser: {e}")
        finally:
            self._is_started = False

    async def get_page(self) -> Page:
        """Get the current page, starting browser if needed."""
        if not self._page or not self._is_started:
            await self.start()
        return self._page

    async def navigate(self, url: str):
        """Navigate to a URL."""
        page = await self.get_page()
        await page.goto(url, timeout=30000)

    async def get_url(self) -> str:
        """Get current URL."""
        page = await self.get_page()
        return page.url

    async def get_title(self) -> str:
        """Get page title."""
        page = await self.get_page()
        return await page.title()

    async def get_viewport(self) -> Dict[str, int]:
        """Get viewport dimensions."""
        page = await self.get_page()
        size = page.viewport_size
        return size if size else {"width": 1280, "height": 800}

    async def screenshot(self, path: str):
        """Take a screenshot."""
        page = await self.get_page()
        await page.screenshot(path=path)

    async def click(self, selector: str, timeout: int = 5000):
        """Click an element."""
        page = await self.get_page()
        await page.click(selector, timeout=timeout)

    async def fill(self, selector: str, value: str, timeout: int = 5000):
        """Fill an input element."""
        page = await self.get_page()
        await page.fill(selector, value, timeout=timeout)

    async def evaluate(self, expression: str):
        """Evaluate a JS expression."""
        page = await self.get_page()
        return await page.evaluate(expression)

    async def extract_dom_elements(self) -> List[DOMElement]:
        """Extract DOM elements from current page."""
        page = await self.get_page()

        script = """
        () => {
            const elements = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            let idCounter = 0;

            while(walker.nextNode()) {
                const node = walker.currentNode;
                const tagName = node.tagName.toLowerCase();
                const isInteractive = ['input', 'button', 'select', 'textarea', 'a'].includes(tagName);

                const style = window.getComputedStyle(node);
                if (style.display === 'none' || style.visibility === 'hidden') continue;

                const rect = node.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) continue;

                const hasDirectText = Array.from(node.childNodes).some(child => child.nodeType === 3 && child.textContent.trim().length > 0);

                if (isInteractive || hasDirectText) {
                    const id = node.id || `${tagName}_${idCounter++}`;
                    if (!node.id) node.id = id;

                    let label = null;

                    if (node.id) {
                        const labelEl = document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
                        if (labelEl) label = labelEl.textContent.trim();
                    }
                    if (!label) label = node.getAttribute('aria-label');
                    if (!label && node.getAttribute('aria-labelledby')) {
                        const lBy = document.getElementById(node.getAttribute('aria-labelledby'));
                        if (lBy) label = lBy.textContent.trim();
                    }
                    if (!label && node.closest('label')) {
                        label = node.closest('label').textContent.trim();
                    }
                    if (!label && node.placeholder) label = node.placeholder;
                    if (!label && (tagName === 'button' || tagName === 'a')) label = node.textContent.trim();
                    if (!label && hasDirectText && !isInteractive) label = node.textContent.trim();
                    if (!label && isInteractive) label = node.name || id;

                    const attrs = {};
                    for (const attr of node.attributes) {
                        attrs[attr.name] = attr.value;
                    }

                    elements.push({
                        element_id: id,
                        type: tagName,
                        role: node.getAttribute('role') || tagName,
                        label: label,
                        value: isInteractive ? (node.value || null) : null,
                        text: node.textContent.trim(),
                        bbox: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
                        attributes: attrs,
                        is_interactive: isInteractive
                    });
                }
            }
            return elements;
        }
        """

        raw_elements = await page.evaluate(script)
        dom_elements = []
        for raw in raw_elements:
            dom_elements.append(DOMElement(**raw))
        return dom_elements
