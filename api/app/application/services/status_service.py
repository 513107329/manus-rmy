from app.domain.models.health_status import HealthStatus
from app.domain.external.health_checker import HealthChecker
import asyncio


class StatusService:
    def __init__(self, health_checkers: list[HealthChecker]):
        self._health_checkers = health_checkers

    async def check_all(self) -> list[HealthStatus]:
        statuses = []
        results = await asyncio.gather(
            *[checker.check() for checker in self._health_checkers],
            return_exceptions=True
        )
        for res in results:
            if isinstance(res, Exception):
                statuses.append(
                    HealthStatus(
                        status="error",
                        service="未知服务",
                        detail="未知服务未响应",
                    )
                )
            else:
                statuses.append(res)
        return statuses
