from fastapi import APIRouter

router = APIRouter(prefix="/file", tags=["文件模块"])


@router.get("/health")
def health():
    return {"status": "ok"}
