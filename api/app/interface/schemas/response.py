from pydantic import BaseModel, Field
from typing import Optional, Generic, TypeVar

T = TypeVar('T')

class Response(BaseModel, Generic[T]):
    code: int = 200
    message: str = 'success'
    data: Optional[T] = Field(default_factory=dict)

    @staticmethod
    def success(message: str = 'success', data: Optional[T] = None) -> 'Response[T]':
        return Response(code=200, message=message, data=data if data else {})

    @staticmethod
    def fail(code: int=500, message: str = 'fail', data: Optional[T] = None) -> 'Response[T]':
        return Response(code=code, message=message, data=data if data else {})