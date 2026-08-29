from abc import ABC, abstractmethod
from backend.models.domain import AgentAction, SanitizedPageState

class BrowserAgent(ABC):
    @abstractmethod
    def next_action(self, state: SanitizedPageState) -> AgentAction | None:
        pass

