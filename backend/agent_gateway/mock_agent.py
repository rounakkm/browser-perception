from backend.agent_gateway.interfaces import BrowserAgent
from backend.models.domain import AgentAction, SanitizedPageState


class SavedProfileMockAgent(BrowserAgent):
    """Demo-only policy that uses tokens, never values, for saved profile fields."""
    def __init__(self):
        self._acted_on: set[str] = set()

    def next_action(self, state: SanitizedPageState) -> AgentAction | None:
        for element in state.elements:
            if element.is_interactive and element.type in {"input", "email", "tel", "password"} and element.element_id not in self._acted_on:
                self._acted_on.add(element.element_id)
                if element.sensitive:
                    return AgentAction(action="fill", element_id=element.element_id, value_token=element.value)
                return AgentAction(action="fill", element_id=element.element_id, value="Updated by local demo")
        save = next((e for e in state.elements if e.element_id == "save_btn"), None)
        if save and "save_btn" not in self._acted_on:
            self._acted_on.add("save_btn")
            return AgentAction(action="click", element_id="save_btn")
        return None
