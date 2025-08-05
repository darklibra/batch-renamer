import os
from sqlmodel import create_engine, SQLModel, Session

from .config.settings_base import BaseConfig
from .config.settings_local import LocalConfig

# 다른 환경 설정이 있다면 여기에 추가
# from .config.settings_dev import DevConfig
# from .config.settings_prod import ProdConfig


def get_settings() -> BaseConfig:
    env = os.getenv("ENV_NAME", "local").lower()

    if env == "local":
        return LocalConfig()
    # elif env == "dev":
    #     return DevConfig()
    # elif env == "prod":
    #     return ProdConfig()
    else:
        print(
            f"경고: '{env}' 환경에 대한 설정 파일을 찾을 수 없습니다. 기본 설정을 사용합니다."
        )
        return BaseConfig()


settings = get_settings()

engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
