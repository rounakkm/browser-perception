from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    AGENT_ENDPOINT: Optional[str] = "http://localhost:8001/agent/action"
    BROWSER_HEADLESS: bool = True
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000
    HOST: str = "127.0.0.1"

    class Config:
        env_file = ".env"

settings = Settings()
