# conftest.py - pytest自动加载此文件，确保项目根目录在sys.path中
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as client:
        yield client
