from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # JSearch (RapidAPI) — paid job aggregator: LinkedIn + Indeed + Glassdoor
    # + ZipRecruiter in one API. Leave empty to skip this source.
    # Get a key at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
    rapidapi_key: str = ""

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
