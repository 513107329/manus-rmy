from fastapi import APIRouter

router = APIRouter(prefix="/supervisor", tags=["Supervisor模块"])


@router.get("/health")
def health():
    return {"status": "ok"}
