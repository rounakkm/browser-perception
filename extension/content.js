(() => {
  const policy = globalThis.BrowserPerceptionPolicy.decision(location.href);
  if (!policy.allowed) return;
  const sessionId = sessionStorage.getItem("browser-perception-session") || crypto.randomUUID();
  sessionStorage.setItem("browser-perception-session", sessionId);
  let reportTimer;
  const compactText = node => (node?.innerText || node?.textContent || "").trim().replace(/\s+/g, " ").slice(0, 240);
  const labelFor = el => {
    const explicit = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    const ids = (el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
    const referenced = ids.map(id => compactText(document.getElementById(id))).filter(Boolean).join(" ");
    // A current form value is never a label or a text fallback.
    return compactText(explicit) || el.getAttribute("aria-label") || referenced || compactText(el.closest("label")) || el.getAttribute("placeholder") || ((el.tagName === "BUTTON" || el.tagName === "A") ? compactText(el) : "") || el.name || el.id || null;
  };
  const elementId = (el, index) => {
    if (el.id) return el.id;
    const existing = el.dataset.browserPerceptionId;
    if (existing) return existing;
    const id = `bp_${el.tagName.toLowerCase()}_${index}`;
    el.dataset.browserPerceptionId = id;
    return id;
  };
  const pageState = () => {
    const selector = "input, textarea, select, button, a[href], [role=button], [role=link], [role=checkbox], [role=combobox], label, h1, h2, h3, p";
    const elements = [...document.querySelectorAll(selector)].filter(el => {
      const style = getComputedStyle(el), rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }).slice(0, 150).map((el, index) => {
      const rect = el.getBoundingClientRect();
      const interactive = /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName) || el.hasAttribute("role");
      const attrs = {};
      for (const name of ["name", "type", "autocomplete", "aria-label", "aria-labelledby", "role", "href"]) {
        const value = el.getAttribute(name); if (value) attrs[name] = value;
      }
      return {element_id: elementId(el, index), type: el.tagName.toLowerCase(), role: el.getAttribute("role") || el.tagName.toLowerCase(), label: labelFor(el), value: "value" in el ? el.value : null, text: compactText(el), bbox: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)], attributes: attrs, is_interactive: interactive};
    });
    return {session_id: sessionId, page: {url: location.href, title: document.title.slice(0, 240), dom_elements: elements, viewport: {width: innerWidth, height: innerHeight}, timestamp: Date.now() / 1000}};
  };
  const report = () => chrome.runtime.sendMessage({type: "perception", payload: pageState()});
  const scheduleReport = () => { clearTimeout(reportTimer); reportTimer = setTimeout(report, 400); };
  chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    if (message.type !== "execute") return;
    const action = message.action;
    try {
      if (!action || !["click", "fill", "submit"].includes(action.action)) throw new Error("Unsupported action");
      const el = document.getElementById(action.element_id) || document.querySelector(`[data-browser-perception-id="${CSS.escape(action.element_id)}"]`);
      if (!el) throw new Error("Target element no longer exists");
      if (action.action === "click") el.click();
      else if (action.action === "fill") {
        if (!("value" in el)) throw new Error("Target is not fillable");
        el.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set ||
                             Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (nativeSetter && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
          nativeSetter.call(el, action.value || "");
        } else {
          el.value = action.value || "";
        }
        el.dispatchEvent(new Event("input", {bubbles: true}));
        el.dispatchEvent(new Event("change", {bubbles: true}));
      }
      else if (el.form) el.form.requestSubmit(); else throw new Error("Target has no form");
      sendResponse({success: true}); scheduleReport();
    } catch (error) { sendResponse({success: false, error: String(error.message || error)}); }
    return true;
  });
  addEventListener("pageshow", scheduleReport);
  addEventListener("input", scheduleReport, true);
  addEventListener("change", scheduleReport, true);
  new MutationObserver(scheduleReport).observe(document.documentElement, {childList: true, subtree: true});
  report();
})();
