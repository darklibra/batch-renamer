from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # 추가
from app.infrastructure.app_config import create_db_and_tables
from app.interfaces.api.v1.routers import files as files_router
from app.interfaces.api.v1.routers import (
    file_change_patterns as file_change_patterns_router,
)

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 실행
    print("INFO:     startup event")
    create_db_and_tables()
    yield
    # 종료 시 실행 (필요 시)


app = FastAPI(lifespan=lifespan)

app.include_router(files_router.router, prefix="/api/v1/files", tags=["files"])
app.include_router(
    file_change_patterns_router.router,
    prefix="/api/v1/file-change-patterns",
    tags=["file-change-patterns"],
)


@app.get("/")
def read_root():
    return {"message": "Clear File API"}
