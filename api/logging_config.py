"""Structured JSON logging for Alert DOU API.

Every log line is a single JSON object. Fields:
  timestamp   ISO-8601 UTC
  level       DEBUG / INFO / WARNING / ERROR / CRITICAL
  logger      module name
  request_id  8-char hex ID injected by RequestLoggingMiddleware (or "-" at startup)
  message     sanitised log message (CPF and secrets redacted)
  exception   formatted traceback (only on exc_info=True)
  *extra      any extra keys passed via logger.info("msg", extra={...})
"""

import json
import logging
import os
import re
import time
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

# ── Context variable propagated through a single HTTP request ─────────────────
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

# ── Redaction patterns ────────────────────────────────────────────────────────
_CPF_RE = re.compile(r"\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\s]?\d{2}\b")
_SECRET_RE = re.compile(
    r"(?i)(key|token|secret|password|api_key|apikey|authorization)\s*[=:]\s*\S+",
)
_URL_TOKEN_RE = re.compile(r"(arg\d=)[^&\s\"']+")  # signed URL query params


def _redact(message: str) -> str:
    message = _CPF_RE.sub("[CPF]", message)
    message = _SECRET_RE.sub(r"\1=[REDACTED]", message)
    message = _URL_TOKEN_RE.sub(r"\1[TOKEN]", message)
    return message


# ── JSON formatter ────────────────────────────────────────────────────────────

_SKIP_KEYS = frozenset({
    "msg", "args", "exc_info", "exc_text", "stack_info",
    "levelname", "name", "created", "pathname", "filename",
    "lineno", "funcName", "processName", "process",
    "thread", "threadName", "msecs", "relativeCreated", "message",
})


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        message = _redact(record.getMessage())

        entry: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "request_id": request_id_var.get(),
            "message": message,
        }

        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)

        # Attach any extra={} fields passed by the caller
        for key, value in record.__dict__.items():
            if key not in _SKIP_KEYS and not key.startswith("_"):
                entry.setdefault("extra", {})[key] = value

        return json.dumps(entry, ensure_ascii=False, default=str)


# ── Configure root logger ─────────────────────────────────────────────────────

def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)

    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    root.setLevel(getattr(logging, log_level, logging.INFO))

    # Suppress noisy third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
