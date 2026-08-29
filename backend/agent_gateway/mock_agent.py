"""Mock browser agent powered by BM25 element ranking."""
from typing import List, Optional
from backend.agent_gateway.interfaces import BrowserAgent
from backend.agent_gateway.bm25_ranker import BM25Ranker
from backend.models.domain import AgentAction, SanitizedPageState, SanitizedElement


class SavedProfileMockAgent(BrowserAgent):
    """
    Mock agent that uses BM25 ranking on safe textual metadata to rank and select target elements.
    Never inspects raw PII values.
    """

    def __init__(self, intents: Optional[List[str]] = None):
        self.ranker = BM25Ranker()
        self._acted_on: set[str] = set()
        self.intents = intents or [
            "email address",
            "password",
            "phone number",
            "security pin",
            "save changes",
        ]

    def select_element_by_intent(self, intent: str, elements: List[SanitizedElement]) -> SanitizedElement | None:
        """
        Use BM25 to score and select the best matching element for an intent query.
        Excludes already acted-on elements and inactive elements.
        """
        candidates = [e for e in elements if e.is_interactive and e.element_id not in self._acted_on]
        return self.ranker.select_best_element(intent, candidates)

    def next_action(self, state: SanitizedPageState) -> AgentAction | None:
        interactive_elements = [e for e in state.elements if e.is_interactive and e.element_id not in self._acted_on]
        if not interactive_elements:
            return None

        # Try to match configured intents using BM25 ranking
        for intent in self.intents:
            best_element = self.select_element_by_intent(intent, state.elements)
            if best_element:
                self._acted_on.add(best_element.element_id)
                if best_element.type in {"button", "submit"} or (best_element.role and "button" in best_element.role) or "save" in intent or "submit" in intent:
                    return AgentAction(action="click", element_id=best_element.element_id)

                if best_element.sensitive:
                    return AgentAction(action="fill", element_id=best_element.element_id, value_token=best_element.value)
                return AgentAction(action="fill", element_id=best_element.element_id, value="Updated by local demo")

        # Fallback for remaining unacted interactive elements if no intent matched
        for elem in interactive_elements:
            self._acted_on.add(elem.element_id)
            if elem.type in {"button", "submit"} or elem.role == "button":
                return AgentAction(action="click", element_id=elem.element_id)
            if elem.sensitive:
                return AgentAction(action="fill", element_id=elem.element_id, value_token=elem.value)
            return AgentAction(action="fill", element_id=elem.element_id, value="Updated by local demo")

        return None


# Alias for explicit clarity
BM25MockAgent = SavedProfileMockAgent
