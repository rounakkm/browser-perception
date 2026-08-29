importScripts("policy.js");
const API = "http://127.0.0.1:8000";
const sessions = new Map();
async function post(path, body) { const response = await fetch(`${API}${path}`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)}); if (!response.ok) throw new Error(`Local backend returned ${response.status}`); return response.status === 204 ? null : response.json(); }
async function activateTab(tab) {
  if (!tab.id || !tab.url) return;
  const verdict = BrowserPerceptionPolicy.decision(tab.url);
  if (!verdict.allowed) { console.warn(`Browser Perception inactive: ${verdict.reason}`); return; }
  const url = new URL(tab.url);
  if (url.protocol === "https:") {
    const origin = `${url.origin}/*`;
    const granted = await chrome.permissions.contains({origins: [origin]}) || await chrome.permissions.request({origins: [origin]});
    if (!granted) return;
  }
  await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ["policy.js", "content.js"]});
}
chrome.action.onClicked.addListener(tab => activateTab(tab).catch(console.warn));
chrome.runtime.onMessage.addListener((message, sender) => { if (message.type !== "perception" || !sender.tab?.id) return; const {session_id: sessionId} = message.payload; sessions.set(sessionId, sender.tab.id); post("/browser/perception", message.payload).catch(console.warn); });
async function pollActions() { for (const [sessionId, tabId] of sessions) { try { const response = await fetch(`${API}/browser/actions/next?session_id=${encodeURIComponent(sessionId)}`); if (response.status === 204) continue; if (!response.ok) throw new Error(`Action poll returned ${response.status}`); const action = await response.json(); chrome.tabs.sendMessage(tabId, {type: "execute", action}, result => post("/browser/actions/result", {session_id: sessionId, action_id: action.action_id, success: Boolean(result?.success), error: result?.error}).catch(console.warn)); } catch (_) {  } } }
setInterval(pollActions, 400);
