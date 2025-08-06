from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.infrastructure.app_config import create_db_and_tables
from app.interfaces.api.v1.routers import files as files_router
from app.interfaces.api.v1.routers import file_change_patterns as file_change_patterns_router
from app.interfaces.api.v1.routers import exclusion_patterns as exclusion_patterns_router
from app.interfaces.api.v1.routers import test as test_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 실행
    print("INFO:     startup event")
    create_db_and_tables()
    yield
    # 종료 시 실행 (필요 시)

app = FastAPI(lifespan=lifespan)

# CORS 설정
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:9000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range"],
)

app.include_router(files_router.router, prefix="/api/v1/files", tags=["files"])
app.include_router(
    file_change_patterns_router.router,
    prefix="/api/v1/file-change-patterns",
    tags=["file-change-patterns"],
)
app.include_router(
    exclusion_patterns_router.router,
    prefix="/api/v1/exclusion-patterns",
    tags=["exclusion-patterns"],
)
app.include_router(
    test_router.router,
    prefix="/api/v1",
    tags=["test"],
)

@app.get("/")
def read_root():
    return {"message": "Clear File API"}
