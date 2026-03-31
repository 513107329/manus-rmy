from typing import Any


class AppException(RuntimeError):
    def __init__(
        self: "AppException", code: int, status_code: int, msg: str, data: Any = None
    ):
        self.code = code
        self.status_code = status_code
        self.msg = msg
        self.data = data
        super().__init__()


# 400
class BadRequestException(AppException):
    def __init__(self: "BadRequestException", msg: str = "客户端请求错误，请稍后重试"):
        super().__init__(code=400, status_code=400, msg=msg, data={})


# 403
class ForbiddenException(AppException):
    def __init__(self: "ForbiddenException", msg: str = "资源被禁止请求，请稍后重试"):
        super().__init__(code=403, status_code=403, msg=msg, data={})


# 404
class NotFoundException(AppException):
    def __init__(self: "NotFoundException", msg: str = "资源未找到，请稍后重试"):
        super().__init__(code=404, status_code=404, msg=msg, data={})


# 500
class InternalServerErrorException(AppException):
    def __init__(
        self: "InternalServerErrorException", msg: str = "服务器内部错误，请稍后重试"
    ):
        super().__init__(code=500, status_code=500, msg=msg, data={})
