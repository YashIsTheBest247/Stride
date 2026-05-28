from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    # Fallback model used when the primary returns 503/UNAVAILABLE after all
    # retries. Different capacity pool, usually has headroom when 2.5-flash
    # is overloaded. Leave empty to disable the fallback.
    gemini_model_fallback: str = "gemini-2.5-flash-lite"

    tectonic_bin: str = "tectonic"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    host: str = "0.0.0.0"
    port: int = 8000

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
