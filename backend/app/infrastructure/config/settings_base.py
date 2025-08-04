from pydantic_settings import BaseSettings

class BaseConfig(BaseSettings):
    APP_NAME: str = "Clear File"
    DEBUG: bool = False
    DATABASE_URL: str

    class Config:
        env_file = ".env"
