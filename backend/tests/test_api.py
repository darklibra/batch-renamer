from fastapi.testclient import TestClient
from pathlib import Path

from app.main import app

client = TestClient(app)

def test_list_files_success(tmp_path: Path):
    # 테스트용 파일 생성
    (tmp_path / "testfile.txt").write_text("hello")

    response = client.get(f"/api/files?path={tmp_path}")
    
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "testfile.txt"

def test_list_files_not_found():
    response = client.get("/api/files?path=/non/existent/path")
    assert response.status_code == 404
    assert response.json() == {"detail": "Directory not found"}

def test_list_files_requires_path():
    response = client.get("/api/files")
    # FastAPI 422: Unprocessable Entity for validation errors
    assert response.status_code == 422
