from app.domain.models.app_config import LLM_Config
from app.domain.repositories.app_config_repository import AppConfigRepository


class AppConfigService:
    def __init__(self, app_config_repository: AppConfigRepository):
        self.app_config_repository = app_config_repository

    def get_llm_config(self):
        return self.app_config_repository.load().llm_config

    def get_app_config(self):
        return self.app_config_repository.load()

    def update_llm_config(self, llm_config: LLM_Config):
        app_config = self.app_config_repository.load()
        app_config.llm_config = llm_config
        self.app_config_repository.save(app_config)
        return llm_config
