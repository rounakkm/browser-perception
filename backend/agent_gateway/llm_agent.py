"""LLM-powered browser agent executing structured actions on sanitized page states."""
import json
import logging
import re
from typing import Optional

from backend.agent_gateway.interfaces import BrowserAgent
from backend.agent_gateway.llm_provider import BaseLLMProvider, get_llm_provider
from backend.models.domain import AgentAction, SanitizedPageState

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a privacy-preserving web navigation AI agent.
You operate strictly on sanitized webpage representations where sensitive user data has been replaced with local security tokens.

SECURITY & PRIVACY RULES:
1. Sensitive input fields contain tokens in the format [CATEGORY_ID] (e.g., [PERSON_NAME_0], [EMAIL_1], [PASSWORD_2]).
2. When filling sensitive fields (where sensitive=true or value contains a token), YOU MUST return "value_token": "[EXACT_TOKEN]".
3. NEVER invent, guess, or type plain text passwords, credit cards, or personal data for sensitive fields.
4. For normal, non-sensitive text fields, you may provide text using "value": "text to fill".

AVAILABLE STRUCTURED ACTIONS:
- Fill action (sensitive field):
  {"action": "fill", "element_id": "<id>", "value_token": "<token_string>"}

- Fill action (normal field):
  {"action": "fill", "element_id": "<id>", "value": "<text>"}

- Click action:
  {"action": "click", "element_id": "<id>"}

- Submit action:
  {"action": "submit", "element_id": "<id>"}

- Navigate action:
  {"action": "navigate", "url": "<target_url>"}

- Task complete:
  {"action": "done", "reason": "Reason for completion"}

OUTPUT REQUIREMENT:
Respond ONLY with a single JSON object. Do not include explanatory text or markdown code fences outside JSON.
"""


class LLMBrowserAgent(BrowserAgent):
    def __init__(self, task: str = "Complete the browser task", provider: Optional[BaseLLMProvider] = None):
        self.task = task
        self.provider = provider or get_llm_provider()
        self._acted_on: set[str] = set()

    def _format_element(self, elem) -> str:
        s_flag = "🔒 [SENSITIVE]" if elem.sensitive else "📄 [NORMAL]"
        label = elem.label or "(no label)"
        val_text = f"value_token='{elem.value}'" if (elem.sensitive and elem.value) else (f"value='{elem.value}'" if elem.value else f"text='{elem.text or ''}'")
        return f"- Element ID: '{elem.element_id}' | Type: {elem.type} | {s_flag} | Label: '{label}' | {val_text}"

    def build_user_prompt(self, state: SanitizedPageState) -> str:
        interactive_elements = [e for e in state.elements if e.is_interactive and e.element_id not in self._acted_on]
        lines = [
            f"User Goal: {self.task}",
            f"Page Title: {state.title}",
            f"Page URL: {state.url}",
            "\nAvailable Interactive Elements:",
        ]
        if not interactive_elements:
            lines.append("- (No remaining unacted interactive elements found on page)")
        else:
            for elem in interactive_elements:
                lines.append(self._format_element(elem))
        lines.append("\nSpecify your next single structured JSON action:")
        return "\n".join(lines)

    def next_action(self, state: SanitizedPageState) -> AgentAction | None:
        user_prompt = self.build_user_prompt(state)
        logger.info(f"Sending sanitized prompt to LLM for task '{self.task}'")
        raw_response = self.provider.generate(prompt=user_prompt, system_prompt=SYSTEM_PROMPT)
        action = self.parse_and_validate_action(raw_response, state)
        if action and action.element_id:
            self._acted_on.add(action.element_id)
        return action

    def parse_and_validate_action(self, raw_response: str, state: SanitizedPageState) -> AgentAction | None:
        cleaned = raw_response.strip()
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}. Raw response: {raw_response}")
            raise ValueError(f"LLM response is not valid JSON: {raw_response}") from e

        if not isinstance(data, dict):
            raise ValueError(f"LLM response must be a JSON object, got: {type(data)}")

        act_type = data.get("action")
        if not act_type or act_type not in {"fill", "click", "submit", "navigate", "done"}:
            raise ValueError(f"Invalid or missing action in LLM response: {act_type}")

        if act_type == "done":
            logger.info(f"LLM completed task. Reason: {data.get('reason', 'None provided')}")
            return None

        if act_type == "navigate":
            nav_url = data.get("url")
            if not nav_url:
                raise ValueError("Action 'navigate' requires a 'url'.")
            return AgentAction(action="navigate", url=nav_url)

        element_id = data.get("element_id")
        if not element_id:
            raise ValueError(f"Action '{act_type}' requires an 'element_id'.")

        target_elem = next((e for e in state.elements if e.element_id == element_id), None)
        if not target_elem:
            raise ValueError(f"Element ID '{element_id}' specified by LLM does not exist on the current page.")

        value = data.get("value")
        value_token = data.get("value_token")

        if act_type == "fill":
            if not value_token and value and value.startswith("[") and value.endswith("]"):
                value_token = value
                value = None
            elif target_elem.sensitive:
                if not value_token:
                    value_token = target_elem.value or value
                    value = None

            if not value_token and not value:
                raise ValueError(f"Fill action for element '{element_id}' requires either value or value_token.")

        return AgentAction(
            action=act_type,
            element_id=element_id,
            value=value,
            value_token=value_token
        )
