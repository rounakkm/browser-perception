# Browser Perception Local Chrome Extension

This Manifest V3 extension is the browser-side half of the local trust boundary. It reads selected, visible page state only to send it to `http://127.0.0.1:8000/browser/perception`, and executes only fixed, validated actions returned by that same local backend. It never sends page state directly to an agent or cloud service.

1. Start the gateway on `127.0.0.1:8000`.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this `extension/` directory.
3. Open `http://127.0.0.1:8080/profile`; the localhost demo activates automatically.

## HTTPS sites

For a harmless HTTPS site, click the Browser Perception extension button while that tab is active. Brave requests permission only for that origin, then injects the content script for the current page. It does not receive permanent access to all websites and does not use `<all_urls>`.

The extension requires `activeTab` (user-gesture activation), `scripting` (inject the reviewed content script after a grant), `tabs` (route a validated action to its source tab), localhost host access (contact the FastAPI gateway), and optional `https://*/*` host access. The final item is a requestable pattern, not a pre-granted permission: Brave grants an individual origin when activated.

High-risk pages are deliberately disabled by policy, including banking, payment/wallet, authentication/sign-in, password/vault, account/card, tax and insurance URL patterns. They need a dedicated confirmation and policy workflow; do not bypass this guard with broad permissions.

Only `click`, `fill`, and `submit` can reach the content script. The extension does not evaluate agent-provided JavaScript and agents cannot navigate Brave to a new origin; activate every HTTPS origin explicitly.
