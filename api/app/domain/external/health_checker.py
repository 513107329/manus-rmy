from app.domain.models.health_status import HealthStatus
from typing import Protocol


class HealthChecker(Protocol):
    def check(self) -> HealthStatus: ...
