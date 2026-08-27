from typing import Optional, Dict

class SensitiveValueStore:
    def __init__(self):
        self._store: Dict[str, str] = {}
        self._reverse_store: Dict[str, str] = {}
        self._token_scopes: Dict[str, Optional[str]] = {}
    
    def store_value(self, value: str, token_type: str, scope_id: Optional[str] = None) -> str:
        """Stores a value and returns a token representing it."""
        reverse_key = f"{scope_id or ''}\0{value}"
        if reverse_key in self._reverse_store:
            return self._reverse_store[reverse_key]
            
        token = f"[{token_type}_{len(self._store)}]"
        self._store[token] = value
        self._reverse_store[reverse_key] = token
        self._token_scopes[token] = scope_id
        return token
        
    def get_value(self, token: str, scope_id: Optional[str] = None) -> Optional[str]:
        """Retrieves the original value for a token."""
        if scope_id is not None and self._token_scopes.get(token) != scope_id:
            return None
        return self._store.get(token)

    def clear(self):
        self._store.clear()
        self._reverse_store.clear()
        self._token_scopes.clear()


value_store = SensitiveValueStore()
