from websockets import ConnectionClosed
from fastapi import WebSocketDisconnect
import websockets
import logging
from fastapi import WebSocket
from app.interface.schemas.session import ShellReadRequest
from app.interface.schemas.session import ShellReadResponse
from app.interface.schemas.session import FileReadRequest
from app.interface.schemas.session import FileReadResponse
from app.interface.schemas.session import GetSessionFilesResponse
import asyncio
from app.interface.schemas.session import GetSessionResponse
from app.interface.schemas.event import EventMapper
from datetime import datetime
from fastapi.sse import ServerSentEvent
from fastapi.sse import format_sse_event
from typing import AsyncGenerator
from fastapi.responses import EventSourceResponse
from app.interface.dependencies import get_agent_service
from app.application.services.agent_service import AgentService
from app.interface.schemas.session import ChatRequest
from typing import Dict
from typing import Optional
from app.interface.schemas.session import ListSessionItem
from app.interface.schemas.session import ListSessionResponse
from typing import List
from app.interface.dependencies import get_session_service
from app.application.services.session_service import SessionService
from fastapi import Depends
from app.interface.schemas import Response
from fastapi import APIRouter
from app.interface.schemas.session import CreateSessionResponse
from app.domain.models.session import Session

router = APIRouter(prefix="/sessions", tags=["Session模块"])

logger = logging.getLogger(__name__)


@router.post(
    path="/", summary="创建会话", response_model=Response[CreateSessionResponse]
)
async def create(session_service: SessionService = Depends(get_session_service)):
    session = await session_service.create_session()
    return Response.success(
        message="创建任务会话成功", data=CreateSessionResponse(session_id=session.id)
    )


@router.get(path="/stream", summary="流式获取会话列表")
async def get_stream_sessions(
    session_service: SessionService = Depends(get_session_service),
) -> EventSourceResponse:
    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        while True:
            sessions = await session_service.get_sessions()
            session_items = [
                ListSessionItem(
                    id=session.id,
                    title=session.title,
                    unread_msg_count=session.unread_msg_count,
                    latest_msg=session.latest_msg,
                    latest_message_at=session.latest_message_at,
                    status=session.status,
                )
                for session in sessions
            ]

            yield format_sse_event(
                data_str=ListSessionResponse(sessions=session_items).model_dump_json(),
                event="sessions",
            )

            await asyncio.sleep(5)

    return EventSourceResponse(event_generator())


@router.get(
    path="/", summary="获取会话列表", response_model=Response[ListSessionResponse]
)
async def get_sessions(session_service: SessionService = Depends(get_session_service)):
    sessions = await session_service.get_sessions()
    session_items = [
        ListSessionItem(
            id=session.id,
            title=session.title,
            unread_msg_count=session.unread_msg_count,
            latest_msg=session.latest_msg,
            latest_message_at=session.latest_message_at,
            status=session.status,
        )
        for session in sessions
    ]
    return Response.success(
        message="获取任务会话列表成功", data=ListSessionResponse(sessions=session_items)
    )


@router.get(
    path="/{session_id}",
    summary="获取会话详情",
    response_model=Response[ListSessionItem],
)
async def get_session(
    session_id: str, session_service: SessionService = Depends(get_session_service)
):
    session = await session_service.get_session(session_id)
    session_item = ListSessionItem(
        id=session.id,
        title=session.title,
        unread_msg_count=session.unread_msg_count,
        latest_msg=session.latest_msg,
        latest_message_at=session.latest_message_at,
        status=session.status,
    )
    return Response.success(message="获取任务会话详情成功", data=session_item)


@router.post(
    path="/{session_id}/clear-unread-session-message",
    summary="清空未读消息",
    response_model=Response[Optional[Dict]],
)
async def clear_unread_session_message(
    session_id: str,
    session_service: SessionService = Depends(get_session_service),
):
    await session_service.clear_unread_msg_count(session_id)
    return Response.success(message="清空未读消息成功", data=None)


@router.post(
    path="/{session_id}/delete",
    summary="删除会话",
    response_model=Response[Optional[Dict]],
)
async def delete_session(
    session_id: str,
    session_service: SessionService = Depends(get_session_service),
):
    await session_service.delete_session(session_id)
    return Response.success(message="删除会话成功", data=None)


@router.post(
    path="/{session_id}/update-title",
    summary="更新会话标题",
    response_model=Response[Optional[Dict]],
)
async def update_session_title(
    session_id: str,
    title: str,
    session_service: SessionService = Depends(get_session_service),
):
    await session_service.update_session_title(session_id, title)
    return Response.success(message="更新会话标题成功", data=None)


@router.post(
    path="/{session_id}/chat",
    summary="会话聊天",
    description="会话聊天",
    response_model=Response[Optional[Dict]],
)
async def chat(
    session_id: str,
    request: ChatRequest,
    agent_service: AgentService = Depends(get_agent_service),
) -> EventSourceResponse:
    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        async for event in agent_service.chat(
            session_id=session_id,
            message=request.message,
            attachments=request.attachments,
            latest_event_id=request.event_id,
            timestamp=(
                datetime.fromtimestamp(request.timestamp) if request.timestamp else None
            ),
        ):
            # 将event事件转换为sse数据
            sse_event = EventMapper.event_to_sse_event(event)
            yield format_sse_event(
                data_str=sse_event.model_dump_json(), event=sse_event.event
            )

    return EventSourceResponse(event_generator())


@router.get(
    path="/{session_id}",
    summary="获取会话消息",
    response_model=Response[GetSessionResponse],
)
async def get_session_messages(
    session_id: str,
    session_service: SessionService = Depends(get_session_service),
):
    session = await session_service.get_session(session_id)
    return Response.success(
        message="获取会话消息成功",
        data=GetSessionResponse(
            session_id=session.id,
            title=session.title,
            events=EventMapper.events_to_sse_events(session.events),
            status=session.status,
        ),
    )


@router.post(
    path="/{session_id}/stop",
    summary="停止会话",
    response_model=Response[Optional[Dict]],
)
async def stop_session(
    session_id: str,
    agent_service: AgentService = Depends(get_agent_service),
):
    await agent_service.stop_session(session_id)
    return Response.success(message="停止会话成功", data=None)


@router.get(
    path="/{session_id}/files",
    summary="获取会话文件",
    response_model=Response[GetSessionFilesResponse],
)
async def get_session_files(
    session_id: str,
    session_service: SessionService = Depends(get_session_service),
):
    files = await session_service.get_session_files(session_id)
    return Response.success(
        message="获取会话文件成功",
        data=GetSessionFilesResponse(
            session_id=session_id,
            files=files,
        ),
    )


@router.post(
    path="/{session_id}/file",
    summary="查看会话沙箱中的文件",
    response_model=Response[FileReadResponse],
)
async def get_session_file(
    session_id: str,
    request: FileReadRequest,
    session_service: SessionService = Depends(get_session_service),
) -> FileReadResponse:
    data = await session_service.get_session_file(session_id, request.filepath)
    return Response.success(message="获取会话文件成功", data=FileReadResponse(**data))


@router.post(
    path="/{session_id}/shell",
    summary="获取会话沙箱的shell内容",
    response_model=Response[ShellReadResponse],
)
async def read_shell_output(
    session_id: str,
    request: ShellReadRequest,
    session_service: SessionService = Depends(get_session_service),
) -> ShellReadResponse:
    data = await session_service.read_shell_output(session_id, request.session_id)
    return Response.success(message="获取会话shell成功", data=ShellReadResponse(**data))


@router.websocket(path="/{session_id}/vnc")
async def vnc_websocket(
    session_id: str,
    websocket: WebSocket,
    session_service: SessionService = Depends(get_session_service),
):
    """VNC WebSocket端点，用于建立与沙箱环境的vnc连接，并双向转发数据"""
    # 从客户端noVNC接收子协议
    protocol_str = websocket.headers.get("sec-websocket-protocol", "")
    protocols = [p.strip() for p in protocol_str.split(",")]

    # 判断使用不同协议（noVnc首选binary）
    if "binary" in protocols:
        selected_protocol = "binary"
    else:
        selected_protocol = "base64"

    # 使用对应协议接收websocket连接
    await websocket.accept(subprotocol=selected_protocol)

    try:
        sandbox_vnc_url = await session_service.get_sandbox_vnc_url(session_id)
        logger.info(f"连接Websocket VNC: {sandbox_vnc_url}")

        async with websockets.connect(sandbox_vnc_url) as sandbox_websocket:

            async def forwrad_to_sandbox():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        logger.info(f"收到客户端数据: {data}")
                        await sandbox_websocket.send(data)
                except WebSocketDisconnect:
                    logger.info("VNC WebSocket连接已断开")
                except Exception as e:
                    logger.error(f"forwrad_to_sandbox失败: {e}")

            async def forwrad_to_client():
                try:
                    while True:
                        data = await sandbox_websocket.recv()
                        await websocket.send_bytes(data)
                except ConnectionClosed:
                    logger.info("WebSocket连接关闭")
                except Exception as e:
                    logger.error(f"forwrad_to_client失败: {e}")

            forward_to_sandbox_task = asyncio.create_task(forwrad_to_sandbox())
            forward_to_client_task = asyncio.create_task(forwrad_to_client())

            _, pending = await asyncio.wait(
                [forward_to_sandbox_task, forward_to_client_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()
    except ConnectionError as connection_error:
        logger.error(f"VNC WebSocket连接失败: {connection_error}")
        await websocket.close(
            code=1011, reason=f"连接沙箱环境失败：{str(connection_error)}"
        )
    except Exception as e:
        logger.error(f"VNC WebSocket连接失败: {e}")
        await websocket.close(code=1011, reason=f"websocket异常：{str(e)}")
