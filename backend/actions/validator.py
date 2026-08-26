from typing import Optional
from backend.models.domain import SanitizedPageState, AgentAction

class ActionValidator:
    def __init__(self):
        self.allowed_actions = ["click", "fill", "select", "scroll", "navigate", "submit"]

    def validate(self, action: AgentAction, current_state: SanitizedPageState) -> bool:
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
            
        
        if action.action in ["click", "fill"] and not target_element.is_interactive:
            
            pass
            
        return True
