from app.domain.models.app_config import Mcp_Config
from app.domain.models.app_config import Agent_Config
from typing import Optional
from app.domain.models.app_config import App_Config, LLM_Config
from pathlib import Path
from app.domain.repositories.app_config_repository import AppConfigRepository
import yaml
from filelock import FileLock
import logging

logger = logging.getLogger(__name__)


class FileAppConfigRepository(AppConfigRepository):
    def __init__(self, config_path: str) -> None:
        root_dir = Path.cwd()
        self.config_path = root_dir.joinpath(root_dir, config_path)
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock_file = self.config_path.with_suffix(".lock")

    def _create_default_config_if_not_exists(self):
        if not self.config_path.exists():
            default_app_config = App_Config(
                llm_config=LLM_Config(),
                agent_config=Agent_Config(),
                mcp_config=Mcp_Config(),
            )
            self.save(default_app_config)

    def load(self) -> Optional[App_Config]:
        self._create_default_config_if_not_exists()
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                return App_Config.model_validate(data) if data else None
        except FileNotFoundError:
            return None

    def save(self, config: App_Config):
        lock = FileLock(self._lock_file, timeout=5)
        try:
            with lock:
                with open(self.config_path, "w", encoding="utf-8") as f:
                    yaml.dump(
                        config.model_dump(mode="json"),
                        f,
                        allow_unicode=True,
                        sort_keys=False,
                    )
        except Exception as e:
            logger.error(f"保存配置文件失败: {e}")
