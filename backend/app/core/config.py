from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite+aiosqlite:///./examwise.db"

    # JWT
    secret_key: str = "CHANGE_ME_IN_PRODUCTION_SECRET_KEY_EXAMWISE_AI_2026"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Fernet key for encrypting AI provider secrets at rest
    fernet_key: str = ""

    # Application
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:4173,http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:5173"

    # AI Providers
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:1.7b"
    ollama_timeout_seconds: float = 300.0  # 5 minutes
    ollama_num_ctx: int = 4096  # Optimized for 4GB RTX 2050 VRAM & multi-doc context
    ollama_num_thread: int = 8  # Tuned for 12-thread i5-12450HX
    gemini_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # File uploads
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
