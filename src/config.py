"""Configuration and type definitions for Gmail Agent."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    anthropic_api_key: str = Field(..., env="ANTHROPIC_API_KEY")
    gmail_credentials_path: Path = Field(
        default=Path("credentials.json"), env="GMAIL_CREDENTIALS_PATH"
    )
    gmail_token_path: Path = Field(default=Path("token.json"), env="GMAIL_TOKEN_PATH")
    max_emails: int = Field(default=10, env="MAX_EMAILS")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def get_settings() -> Settings:
    """Get application settings."""
    return Settings()

