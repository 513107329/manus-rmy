from pydantic import Field, ConfigDict, HttpUrl, BaseModel


class App_Config(BaseModel):
    llm_config: LLM_Config

    model_config = ConfigDict(
        extra="allow",
    )


class LLM_Config(BaseModel):
    base_url: HttpUrl = "https://api.deepseek.com"
    api_key: str = ""
    model_name: str = "deepseek-chat"
    tempature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=8192, ge=1)
