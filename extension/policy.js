globalThis.BrowserPerceptionPolicy = (() => {
  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  const highRiskTerms = ["bank", "banking", "finance", "payment", "pay", "wallet", "checkout", "auth", "login", "signin", "sso", "password", "vault", "identity", "account", "card", "credit", "insurance", "tax"];
  function decision(urlString) {
    let url;
    try { url = new URL(urlString); } catch (_) { return {allowed: false, reason: "invalid URL"}; }
    if (url.protocol === "file:" || (url.protocol === "http:" && localHosts.has(url.hostname))) return {allowed: true, reason: "local demo"};
    if (url.protocol !== "https:") return {allowed: false, reason: "only HTTPS pages and localhost demo pages are supported"};
    const haystack = `${url.hostname}${url.pathname}`.toLowerCase();
    if (highRiskTerms.some(term => haystack.includes(term))) return {allowed: false, reason: "high-risk page is disabled by policy"};
    return {allowed: true, reason: "HTTPS page allowed"};
  }
  return {decision};
})();
