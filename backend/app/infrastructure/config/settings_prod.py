from .settings_base import BaseConfig

class ProdConfig(BaseConfig):
    DEBUG = False
    class Config:
        env_file = ".env.prod"
