from app.interface.schemas.base import ListA2AServerResponse
from app.domain.models.app_config import A2A_Config
from app.interface.schemas.base import ListMCPServerResponse
from fastapi import Body
from app.domain.models.app_config import McpServerConfig
from typing import Optional
from typing import Dict
from app.domain.models.app_config import Mcp_Config
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
    updated_agent_config = app_config_service.update_agent_config(new_agent_config)
    return Response(
        data=updated_agent_config.model_dump(),
        message="更新成功",
    )


# MCP服务
@router.get(
    "/mcp-servers",
    response_model=Response[ListMCPServerResponse],
    summary="获取MCP服务器工具列表",
    description="获取当前系统的MCP服务器列表：MCP服务名字、工具列表、启用状态",
)
async def get_mcp_servers(
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[ListMCPServerResponse]:
    app_config = await app_config_service.get_mcp_servers()
    if app_config is None:
        return Response(data=None)
    return Response(data=app_config)


@router.post(
    "/mcp-servers",
    response_model=Response[Optional[Dict]],
    summary="新增MCP服务配置，支持传递一个或者多个配置",
    description="传递MCP配置信息为系统添加MCP工具",
)
async def create_mcp_server(
    mcp_config: Mcp_Config,
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[Mcp_Config]:
    updated_mcp_config = app_config_service.update_and_create_mcp_server(mcp_config)
    return Response.success(
        data=updated_mcp_config.model_dump(),
        message="创建成功",
    )


@router.post(
    "/mcp-servers/{server_name}/enable",
    response_model=Response[Optional[Dict]],
    summary="更新MCP服务启用状态",
    description="根据传递的MCP服务名字为系统更新MCP工具的启用状态",
)
async def enable_mcp_server(
    server_name: str,
    config: Dict[str, bool],
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[Mcp_Config]:
    try:
        updated_mcp_config = app_config_service.enable_mcp_server(
            server_name, config.get("enable")
        )
        return Response.success(
            data=updated_mcp_config.model_dump(),
            message="更新MCP服务启用状态成功",
        )
    except ValueError as e:
        return Response.fail(message=str(e))


@router.delete(
    "/mcp-servers/{server_name}/delete",
    response_model=Response[Optional[Dict]],
    summary="删除MCP服务配置",
    description="根据传递的MCP服务名字为系统删除MCP工具",
)
async def delete_mcp_server(
    server_name: str,
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[Mcp_Config]:
    try:
        updated_mcp_config = app_config_service.delete_mcp_server(server_name)
        return Response.success(
            data=updated_mcp_config.model_dump(),
            message="删除成功",
        )
    except ValueError as e:
        return Response.fail(message=str(e))


# A2A服务
@router.get(
    "/a2a-servers",
    response_model=Response[ListA2AServerResponse],
    summary="获取A2A服务器工具列表",
    description="获取当前系统的A2A服务器列表：A2A服务名字、启用状态",
)
async def get_a2a_servers(
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[ListA2AServerResponse]:
    app_config = await app_config_service.get_a2a_servers()
    if app_config is None:
        return Response(data=None)
    return Response.success(data=app_config)


@router.post(
    "/a2a-servers",
    response_model=Response[A2A_Config],
    summary="新增A2A服务配置",
    description="传递A2A配置信息为系统添加A2A工具",
)
async def create_a2a_server(
    base_url: str = Body(..., embed=True),
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[A2A_Config]:
    updated_a2a_config = app_config_service.create_a2a_server(base_url)
    return Response.success(
        data=updated_a2a_config.model_dump(),
        message="创建成功",
    )


@router.post(
    "/a2a-servers/{id}/enable",
    response_model=Response[A2A_Config],
    summary="更新A2A服务启用状态",
    description="根据传递的A2A服务id为系统更新A2A工具的启用状态",
)
async def enable_a2a_server(
    id: str,
    config: Dict[str, bool],
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[A2A_Config]:
    try:
        updated_a2a_config = app_config_service.enable_a2a_server(
            id, config.get("enable")
        )
        return Response.success(
            data=updated_a2a_config.model_dump(),
            message="更新A2A服务启用状态成功",
        )
    except ValueError as e:
        return Response.fail(message=str(e))


@router.delete(
    "/a2a-servers/{id}/delete",
    response_model=Response[A2A_Config],
    summary="删除A2A服务配置",
    description="根据传递的A2A服务id为系统删除A2A工具",
)
async def delete_a2a_server(
    id: str,
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> Response[A2A_Config]:
    try:
        updated_a2a_config = app_config_service.delete_a2a_server(id)
        return Response.success(
            data=updated_a2a_config.model_dump(),
            message="删除成功",
        )
    except ValueError as e:
        return Response.fail(message=str(e))
