from typing import Optional
from backend.models.domain import SanitizedPageState, AgentAction
from backend.security.store import value_store

class ActionValidator:
    def __init__(self):
        self.allowed_actions = ["click", "fill", "select", "scroll", "navigate", "submit"]

    def validate(self, action: AgentAction, current_state: SanitizedPageState, scope_id: str | None = None) -> bool:
        """
        Validates if an action is permitted based on the current sanitized state.
        """
        if action.action not in self.allowed_actions:
            raise ValueError(f"Action '{action.action}' is not allowed.")
        if action.action == "navigate":
            if not action.url:
                raise ValueError("Navigation action requires a URL.")
            return True
        if not action.element_id:
            raise ValueError(f"Action '{action.action}' requires an element_id.")
        target_element = None
        for element in current_state.elements:
            if element.element_id == action.element_id:
                target_element = element
                break
        if not target_element:
            raise ValueError(f"Target element '{action.element_id}' not found in current state.")
        if action.action in ["click", "fill", "select", "submit"] and not target_element.is_interactive:
            raise ValueError(f"Target element '{action.element_id}' is not interactive.")

        if action.action == "fill":
            if target_element.sensitive:
                if not action.value_token or action.value:
                    raise ValueError("Sensitive fields must be filled with a valid value_token only.")
                if value_store.get_value(action.value_token, scope_id) is None:
                    raise ValueError("Invalid or expired sensitive value token.")
            elif action.value is None and action.value_token is None:
                raise ValueError("Fill action requires value or value_token.")
            elif action.value_token and action.value_token.startswith("[") and value_store.get_value(action.value_token, scope_id) is None:
                raise ValueError("Invalid sensitive value token.")
        return True
