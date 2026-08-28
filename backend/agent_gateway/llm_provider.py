"""LLM Provider abstraction for browser agent execution."""
from abc import ABC, abstractmethod
import os
import json
import logging
from typing import Optional, Dict, Any, Callable
import httpx

logger = logging.getLogger(__name__)


class BaseLLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate raw text response from the LLM provider."""
        pass


class OpenAICompatibleProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not provided. Set OPENAI_API_KEY or LLM_API_KEY.")
        self.base_url = (base_url or os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
        self.model = model or os.getenv("OPENAI_MODEL") or os.getenv("LLM_MODEL") or "gpt-4o-mini"
        self.timeout = timeout

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.0,
        }

        url = f"{self.base_url}/chat/completions"
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]


class GeminiLLMProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY")
        if not self.api_key:
            raise ValueError("Gemini API key not provided. Set GEMINI_API_KEY or LLM_API_KEY.")
        self.model = model or os.getenv("GEMINI_MODEL") or os.getenv("LLM_MODEL") or "gemini-3.6-flash"
        self.timeout = timeout

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        headers = {"Content-Type": "application/json"}
        full_text = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        interactions_url = f"https://generativelanguage.googleapis.com/v1beta/interactions?key={self.api_key}"
        interactions_payload = {
            "model": self.model,
            "input": prompt,
        }
        if system_prompt:
            interactions_payload["system_instruction"] = system_prompt

        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(interactions_url, headers=headers, json=interactions_payload)
            if resp.status_code == 200:
                data = resp.json()
                if "output" in data and isinstance(data["output"], dict):
                    return data["output"].get("text", "")
                if "text" in data:
                    return data["text"]
                if "candidates" in data and data["candidates"]:
                    parts = data["candidates"][0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")

            model_name = self.model if self.model.startswith("models/") else f"models/{self.model}"
            gen_url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={self.api_key}"
            gen_payload = {
                "contents": [
                    {
                        "parts": [{"text": full_text}]
                    }
                ]
            }
            resp_gen = client.post(gen_url, headers=headers, json=gen_payload)
            if resp_gen.status_code == 404:
                raise ValueError(f"Gemini model '{self.model}' not found (404). Check GEMINI_MODEL setting (default: 'gemini-3.6-flash').")
            if resp_gen.status_code == 400:
                raise ValueError(f"Gemini API Bad Request (400): {resp_gen.text}")
            resp_gen.raise_for_status()
            data = resp_gen.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError("Gemini returned empty response candidates.")
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise RuntimeError("Gemini response candidate contains no text parts.")
            return parts[0]["text"]


class MockLLMProvider(BaseLLMProvider):
    def __init__(self, response_generator: Optional[Callable[[str, str], str]] = None, fixed_response: Optional[str] = None):
        self.response_generator = response_generator
        self.fixed_response = fixed_response
        self.last_prompt: Optional[str] = None
        self.last_system_prompt: Optional[str] = None

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        self.last_prompt = prompt
        self.last_system_prompt = system_prompt
        if self.response_generator:
            return self.response_generator(prompt, system_prompt)
        if self.fixed_response:
            return self.fixed_response
        return json.dumps({"action": "done", "reason": "Mock completion"})


def get_llm_provider(
    provider_name: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> BaseLLMProvider:
    """Factory to retrieve configured LLM provider."""
    name = (provider_name or os.getenv("LLM_PROVIDER") or "").lower()
    if name == "mock":
        return MockLLMProvider()
    if name == "openai" or os.getenv("OPENAI_API_KEY"):
        return OpenAICompatibleProvider(api_key=api_key, model=model)
    if name == "gemini" or os.getenv("GEMINI_API_KEY"):
        return GeminiLLMProvider(api_key=api_key, model=model)
    if os.getenv("LLM_API_KEY"):
        return OpenAICompatibleProvider(api_key=api_key, model=model)
    logger.warning("No LLM API key found in environment. Falling back to MockLLMProvider.")
    return MockLLMProvider()
