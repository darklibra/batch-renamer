from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional

# 프로젝트 루트 디렉토리 설정
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


class BaseConfig(BaseSettings):
    APP_NAME: str = "Clear File"
    DEBUG: bool = False
    DATABASE_URL: Optional[str] = None
