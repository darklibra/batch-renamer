from .settings_base import BaseConfig

class LocalConfig(BaseConfig):
    DEBUG: bool = True

    class Config:
        env_file = "../.env.local"
