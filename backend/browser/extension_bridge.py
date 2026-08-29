from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, Optional
from uuid import uuid4

from backend.models.domain import ExtensionAction, SanitizedPageState

@dataclass
class BrowserSession:
    state: SanitizedPageState
    page_revision: int

class ExtensionBridge:
    def __init__(self):
        self._sessions: Dict[str, BrowserSession] = {}
        self._pending: Dict[str, Deque[ExtensionAction]] = defaultdict(deque)
        self._results: Dict[str, bool] = {}

    def save_state(self, session_id: str, state: SanitizedPageState) -> BrowserSession:
        previous = self._sessions.get(session_id)
        session = BrowserSession(state=state, page_revision=(previous.page_revision + 1 if previous else 1))
        self._sessions[session_id] = session
        return session

    def get_state(self, session_id: str) -> Optional[SanitizedPageState]:
        session = self._sessions.get(session_id)
        return session.state if session else None

    def get_session(self, session_id: str) -> Optional[BrowserSession]:
        return self._sessions.get(session_id)

    def active_session_id(self) -> Optional[str]:
        return next(reversed(self._sessions), None) if self._sessions else None

    def enqueue(self, session_id: str, *, action: str, element_id: str | None = None,
                value: str | None = None, url: str | None = None) -> ExtensionAction:
        item = ExtensionAction(action_id=str(uuid4()), action=action,
                               element_id=element_id, value=value, url=url)
        self._pending[session_id].append(item)
        return item

    def next_action(self, session_id: str) -> Optional[ExtensionAction]:
        return self._pending[session_id].popleft() if self._pending[session_id] else None

    def record_result(self, action_id: str, success: bool) -> None:
        self._results[action_id] = success
