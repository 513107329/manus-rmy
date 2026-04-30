from typing import Any
from fastapi import status


class AppException(Exception):
    def __init__(
        self,
        message: str,
        data: Any = None,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ) -> None:
        self.msg = message
        self.data = data
        self.status_code = status_code

        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, message: str = "未找到资源", data: Any = None) -> None:
        super().__init__(message, data, status.HTTP_404_NOT_FOUND)


class BadRequestException(AppException):
    def __init__(self, message: str, data: Any = None) -> None:
        super().__init__(message, data, status.HTTP_400_BAD_REQUEST)


class UnauthorizedException(AppException):
    def __init__(self, message: str, data: Any = None) -> None:
        super().__init__(message, data, status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    def __init__(self, message: str, data: Any = None) -> None:
        super().__init__(message, data, status.HTTP_403_FORBIDDEN)


class InternalServerErrorException(AppException):
    def __init__(self, message: str, data: Any = None) -> None:
        super().__init__(message, data, status.HTTP_500_INTERNAL_SERVER_ERROR)


class ServiceUnavailableException(AppException):
    def __init__(self, message: str, data: Any = None) -> None:
        super().__init__(message, data, status.HTTP_503_SERVICE_UNAVAILABLE)


class GatewayTimeoutException(AppException):
    def __init__(self, message: str, data: Any = None) -> None:
        super().__init__(message, data, status.HTTP_504_GATEWAY_TIMEOUT)


class TooManyRequestsException(AppException):
    def __init__(self, message: str, data: Any = None) -> None:
        super().__init__(message, data, status.HTTP_429_TOO_MANY_REQUESTS)
