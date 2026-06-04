# 日志输出
from core.config import get_settings
import sys
from pathlib import Path
import logging

_API_ROOT = Path(__file__).resolve().parents[3]
_configured = False

RotatingFileHandler = logging.handlers.RotatingFileHandler

def setup_logging():
    global _configured
    if _configured:
        return

    settings = get_settings()
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    formatter = logging.Formatter(
        "%(asctime)s-%(name)s-%(levelname)s-%(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    log_path = _API_ROOT / settings.log_file
    log_path.parent.mkdir(parents=True, exist_ok=True)

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    _configured = True
    root_logger.info("Logging initialized, log file: %s", log_path)
