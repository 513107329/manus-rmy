from app.interface.schemas.event import EventMapper
from datetime import datetime
from fastapi.sse import ServerSentEvent
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


@router.post(
    path="/", summary="创建会话", response_model=Response[CreateSessionResponse]
)
async def create(session_service: SessionService = Depends(get_session_service)):
    session = await session_service.create_session()
    return Response.success(
        message="创建任务会话成功", data=CreateSessionResponse(session_id=session.id)
    )


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
    await session_service.clear_unread_message_count(session_id)
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
            yield ServerSentEvent(
                data=sse_event.model_dump_json(), event=sse_event.event
            )

    return EventSourceResponse(event_generator())
