import uuid
from pydantic import BaseModel, Field


class File(BaseModel):
    """文件信息Domain模型，用于记录Manus/人类上传或者生成的文件"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_name: str = ""  # 文件名
    file_path: str = ""  # 文件路径
    key: str = ""  # TOS中的路径
    extension: str = ""  # 文件扩展名
    mime_type: str = ""  # MIME类型
    file_size: int = 0  # 文件大小
