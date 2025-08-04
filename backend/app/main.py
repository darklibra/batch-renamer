from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # 추가
from backend.app.infrastructure.app_config import create_db_and_tables
from backend.app.interfaces.api.v1.routers import files as files_router
from backend.app.interfaces.api.v1.routers import file_change_patterns as file_change_patterns_router

app = FastAPI()

# CORS 설정 시작
origins = [
    "http://localhost",
    "http://localhost:3000", # React 개발 서버 주소
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# CORS 설정 끝

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.include_router(files_router.router, prefix="/api/v1/files", tags=["files"])
app.include_router(file_change_patterns_router.router, prefix="/api/v1/file-change-patterns", tags=["file-change-patterns"])

@app.get("/")
def read_root():
    return {"message": "Clear File API"}
