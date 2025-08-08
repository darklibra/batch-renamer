import os
from sqlmodel import create_engine, SQLModel, Session
import importlib

from .config.settings_base import BaseConfig

def get_settings() -> BaseConfig:
    env = os.getenv("ENV_NAME", "local").lower()
    try:
        module_path = f"app.infrastructure.config.settings_{env}"
        module = importlib.import_module(module_path)
        config_class_name = f"{env.capitalize()}Config"
        config_class = getattr(module, config_class_name)
        return config_class()
    except (ImportError, AttributeError):
        # 기본 설정 또는 에러 처리
        return BaseConfig()

settings = get_settings()

engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
