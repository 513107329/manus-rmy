import logging
from app.interface.service_dependencies import get_supervisor_service
from app.core.config import get_settings
from urllib.request import Request

logger = logging.getLogger(__name__)

async def auto_extend_timeout_middleware(request: Request, call_next):
    settings = get_settings()
    supervisor_service = get_supervisor_service()

    ignore_paths = (
        "/api/supervisor/active-timeout",
        "/api/supervisor/extend-timeout",
        "/api/supervisor/cancel-timeout",
        "/api/supervisor/timeout-status"
    )

    if (
        settings.server_timeout_minutes is not None
        and supervisor_service.timeout_active
        and request.url.path.startswith('/api')
        and not request.url.path.startswith(ignore_paths)
        and supervisor_service.expand_enabled
    ):
        try:
            await supervisor_service.extend_timeout(3)
            logger.debug(f"调用API请求自动延长超时时间")
        except Exception as e:
            logger.warning(f"自动延长超时失败：{str(e)}")

    response = await call_next(request)
    return response