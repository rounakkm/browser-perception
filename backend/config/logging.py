import logging
import sys
from backend.config.settings import settings

def setup_logging():
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    root_logger.handlers = []

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    error_handler = logging.FileHandler("error.log", mode="a")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    root_logger.addHandler(error_handler)

    import os
    os.makedirs("logs", exist_ok=True)
    perception_handler = logging.FileHandler("logs/perception.log", mode="a")
    perception_handler.setLevel(log_level)

    perception_formatter = logging.Formatter(fmt="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    perception_handler.setFormatter(perception_formatter)
    root_logger.addHandler(perception_handler)

    return root_logger

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
