import logging
import sys
from backend.config.settings import settings

def setup_logging():
    """Configure logging for the application."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    root_logger.handlers = []

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # File handler for errors
    error_handler = logging.FileHandler("error.log", mode="a")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    root_logger.addHandler(error_handler)

    # File handler for perception UI (captures all logs for the dashboard)
    import os
    os.makedirs("logs", exist_ok=True)
    perception_handler = logging.FileHandler("logs/perception.log", mode="a") # Use append mode because multiple processes write to it
    perception_handler.setLevel(log_level)
    # Simple formatter for the dashboard (just the message or simple time + message)
    perception_formatter = logging.Formatter(fmt="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    perception_handler.setFormatter(perception_formatter)
    root_logger.addHandler(perception_handler)

    return root_logger

def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name."""
    return logging.getLogger(name)
