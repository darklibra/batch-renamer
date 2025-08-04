import os
import importlib
from sqlmodel import create_engine, SQLModel, Session
from .config.settings_base import BaseConfig
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))

def get_settings() -> BaseConfig:
    env = os.getenv("ENV_NAME", "local").lower()
    try:
        module_path = f".config.settings_{env}"
        module = importlib.import_module(module_path, package="backend.app.infrastructure")
        config_class_name = f"{env.capitalize()}Config"
        config_class = getattr(module, config_class_name)
        return config_class()
    except (ImportError, AttributeError):
        print(f"경고: '{env}' 환경에 대한 설정 파일을 찾을 수 없습니다. 기본 설정을 사용합니다.")
        return BaseConfig()

settings = get_settings()

engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
