"""Replaceable agent boundary: agents see sanitized state and emit actions only."""
from abc import ABC, abstractmethod
from backend.models.domain import AgentAction, SanitizedPageState


class BrowserAgent(ABC):
    @abstractmethod
    def next_action(self, state: SanitizedPageState) -> AgentAction | None:
        """Return an action based solely on the sanitized page state."""

