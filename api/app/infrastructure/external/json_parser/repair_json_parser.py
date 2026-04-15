from typing import Any
from typing import Optional
from app.domain.external.json_parser import JSONParser
from json_repair import repair_json
import logging

logger = logging.getLogger(__name__)


class RepairJsonParser(JSONParser):
    async def invoke(self, text: str, default_value: Optional[Any] = None):
        if not text or not text.strip():
            if default_value is not None:
                return default_value
            raise ValueError("Input text is empty")
        try:
            return repair_json(text, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error repairing JSON: {e}")
            if default_value is not None:
                return default_value
            raise ValueError(f"Failed to repair JSON: {e}")
