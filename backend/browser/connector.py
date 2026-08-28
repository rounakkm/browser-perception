import asyncio
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Page, Browser
from backend.models.domain import DOMElement
from backend.config.settings import settings

class BrowserConnector:
    def __init__(self):
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._page: Optional[Page] = None

    async def start(self, headless: Optional[bool] = None):
        if headless is None:
            headless = settings.BROWSER_HEADLESS
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=headless,
            args=["--start-maximized", "--disable-infobars"]
        )
        context = await self._browser.new_context(no_viewport=True)
        self._page = await context.new_page()

    async def stop(self):
        if self._page:
            await self._page.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def get_page(self) -> Page:
        if not self._page:
            await self.start()
        return self._page

    async def navigate(self, url: str):
        page = await self.get_page()
        await page.goto(url)

    async def get_url(self) -> str:
        page = await self.get_page()
        return page.url

    async def get_title(self) -> str:
        page = await self.get_page()
        return await page.title()

    async def get_viewport(self) -> Dict[str, int]:
        page = await self.get_page()
        return page.viewport_size or {"width": 1280, "height": 800}

    async def screenshot(self, path: str):
        page = await self.get_page()
        await page.screenshot(path=path)

    async def extract_dom_elements(self) -> List[DOMElement]:
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
                // Collect interactive inputs/buttons or containers with direct text
                if (isInteractive || hasDirectText) {
                    const id = node.id || `${tagName}_${idCounter++}`;
                    if (!node.id) node.id = id;
                    let label = null;
                    // Label hierarchy priority:
                    // 1. <label for="id">
                    if (node.id) {
                        const labelEl = document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
                        if (labelEl) label = labelEl.textContent.trim();
                    }
                    // 2. aria-label
                    if (!label) {
                        label = node.getAttribute('aria-label');
                    }
                    // 3. aria-labelledby
                    if (!label && node.getAttribute('aria-labelledby')) {
                        const lBy = document.getElementById(node.getAttribute('aria-labelledby'));
                        if (lBy) label = lBy.textContent.trim();
                    }
                    // 4. Closest wrapping <label>
                    if (!label && node.closest('label')) {
                        label = node.closest('label').textContent.trim();
                    }
                    // 5. placeholder
                    if (!label && node.placeholder) {
                        label = node.placeholder;
                    }
                    // 6. Contextual fallback for buttons / links (text content)
                    if (!label && (tagName === 'button' || tagName === 'a')) {
                        label = node.textContent.trim();
                    }
                    // 7. Contextual fallback for text containers
                    if (!label && hasDirectText && !isInteractive) {
                        label = node.textContent.trim();
                    }
                    // Fallback to name or element ID (NEVER USE CURRENT VALUE AS LABEL!)
                    if (!label && isInteractive) {
                        label = node.name || id;
                    }
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
