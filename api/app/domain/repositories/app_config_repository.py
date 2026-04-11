from app.domain.models.app_config import App_Config
from typing import Optional, Protocol


class AppConfigRepository(Protocol):
    def load(self) -> Optional[App_Config]: ...

    def save(self, config: App_Config): ...
