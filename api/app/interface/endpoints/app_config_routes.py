from app.domain.models.app_config import Agent_Config
from app.domain.models.app_config import App_Config
from app.interface.dependencies import get_app_config_service
from fastapi import Depends
from app.application.services.app_config_service import AppConfigService
from app.domain.models.app_config import LLM_Config
from app.interface.schemas import Response
import logging

logger = logging.getLogger(__name__)
from fastapi import APIRouter

router = APIRouter(prefix="/app-config", tags=["应用配置"])


@router.get(
    "/llm-config",
    response_model=Response[LLM_Config],
    summary="获取LLM配置信息",
    description="获取LLM配置信息：模型名称、模型地址、API Key",
)
async def get_llm_config(
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[LLM_Config]:
    app_config = app_config_service.get_llm_config()
    if app_config is None:
        return Response(data=None)
    return Response(data=app_config.model_dump(exclude={"api_key"}))


@router.get(
    "/agent-config",
    response_model=Response[Agent_Config],
    summary="获取Agent配置信息",
    description="获取Agent配置信息：最大重试次数、最大搜索结果数、最大迭代次数",
)
async def get_agent_config(
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[Agent_Config]:
    app_config = app_config_service.get_agent_config()
    if app_config is None:
        return Response(data=None)
    return Response(data=app_config)


@router.get(
    "/app-config",
    response_model=Response[App_Config],
    summary="获取APP配置信息",
    description="获取APP配置信息：模型名称、模型地址、API Key",
)
async def get_app_config(
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[App_Config]:
    app_config = app_config_service.get_app_config()
    if app_config is None:
        return Response(data=None)
    return Response(data=app_config.model_dump(exclude={"api_key"}))


@router.post(
    "/llm-config",
    response_model=Response[LLM_Config],
    summary="更新LLM配置信息",
    description="更新LLM配置信息：模型名称、模型地址、API Key",
)
async def update_llm_config(
    new_llm_config: LLM_Config,
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[LLM_Config]:
    print("new_llm_config", new_llm_config)
    updated_llm_config = app_config_service.update_llm_config(new_llm_config)
    return Response(
        data=updated_llm_config.model_dump(exclude={"api_key"}),
        message="更新成功",
    )


@router.post(
    "/agent-config",
    response_model=Response[Agent_Config],
    summary="更新Agent配置信息",
    description="更新Agent配置信息：最大重试次数、最大搜索结果数、最大迭代次数",
)
async def update_agent_config(
    new_agent_config: Agent_Config,
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[Agent_Config]:
    print("new_agent_config", new_agent_config)
    updated_agent_config = app_config_service.update_agent_config(new_agent_config)
    return Response(
        data=updated_agent_config.model_dump(),
        message="更新成功",
    )
