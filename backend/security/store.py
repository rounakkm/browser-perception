from typing import Optional, Dict

class SensitiveValueStore:
    def __init__(self):
        self._store: Dict[str, str] = {}
        self._reverse_store: Dict[str, str] = {}
    
    def store_value(self, value: str, token_type: str) -> str:
        """Stores a value and returns a token representing it."""
        if value in self._reverse_store:
            return self._reverse_store[value]
            
        token = f"[{token_type}_{len(self._store)}]"
        self._store[token] = value
        self._reverse_store[value] = token
        return token
        
    def get_value(self, token: str) -> Optional[str]:
        """Retrieves the original value for a token."""
        return self._store.get(token)

    def clear(self):
        self._store.clear()
        self._reverse_store.clear()


value_store = SensitiveValueStore()
