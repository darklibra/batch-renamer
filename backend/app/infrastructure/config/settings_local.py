from .settings_base import BaseConfig, BASE_DIR


class LocalConfig(BaseConfig):
    DEBUG: bool = True

    class Config:
        env_file = BASE_DIR / ".env.local"
