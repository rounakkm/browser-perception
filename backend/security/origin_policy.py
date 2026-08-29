from urllib.parse import urlparse

HIGH_RISK_TERMS = {
    "bank", "banking", "finance", "payment", "pay", "wallet", "checkout",
    "auth", "login", "signin", "sso", "password", "vault", "identity",
    "account", "card", "credit", "insurance", "tax",
}
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}

def origin_decision(url: str) -> tuple[bool, str]:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme == "http" and host in LOCAL_HOSTS:
        return True, "local demo origin"
    if parsed.scheme != "https" or not host:
        return False, "only HTTPS origins and the localhost demo are supported"
    haystack = f"{host}{parsed.path}".lower().replace("-", "_")
    if any(term in haystack for term in HIGH_RISK_TERMS):
        return False, "high-risk origin requires a separate confirmation workflow"
    return True, "allowed HTTPS origin"
