from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from typing import List


def _csv_env(name: str, default: str) -> List[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DEFAULT_DATABASE = str(DATA_DIR / "nova.db")
DEFAULT_EMOJI_DATA = str(DATA_DIR / "emoji-kitchen.json.gz")
DEFAULT_EMOJI_LIST = str(DATA_DIR / "emoji-list.json")
DEFAULT_FILEBOX_DIR = str(DATA_DIR / "filebox")


class Config:
    SECRET_KEY = os.getenv("NOVA_SECRET_KEY", "nova-development-secret-change-me")
    DATABASE = os.getenv("NOVA_DATABASE", DEFAULT_DATABASE)
    EMOJI_DATA_PATH = os.getenv("NOVA_EMOJI_DATA_PATH", DEFAULT_EMOJI_DATA)
    EMOJI_LIST_PATH = os.getenv("NOVA_EMOJI_LIST_PATH", DEFAULT_EMOJI_LIST)
    IMPORT_EMOJI_DATA = os.getenv("NOVA_IMPORT_EMOJI_DATA", "true").lower() == "true"
    FILEBOX_DIR = os.getenv("NOVA_FILEBOX_DIR", DEFAULT_FILEBOX_DIR)
    FILEBOX_MAX_UPLOAD_BYTES = int(os.getenv("NOVA_FILEBOX_MAX_UPLOAD_BYTES", str(100 * 1024 * 1024)))
    FILEBOX_MAX_TEXT_BYTES = int(os.getenv("NOVA_FILEBOX_MAX_TEXT_BYTES", str(222 * 1024)))
    MAX_CONTENT_LENGTH = FILEBOX_MAX_UPLOAD_BYTES + (2 * 1024 * 1024)
    CORS_ORIGINS = _csv_env(
        "NOVA_CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    )
    DEMO_USER_ID = os.getenv("NOVA_DEMO_USER_ID", "usr_demo")
    DEMO_EMAIL = os.getenv("NOVA_DEMO_EMAIL", "demo@example.com")
    DEMO_PASSWORD = os.getenv("NOVA_DEMO_PASSWORD", "demo123")
    DEMO_USER_NAME = os.getenv("NOVA_DEMO_USER_NAME", "演示用户")
    DEMO_USER_ROLE = os.getenv("NOVA_DEMO_USER_ROLE", "访客")
    ACCESS_TOKEN_MAX_AGE = int(os.getenv("NOVA_ACCESS_TOKEN_MAX_AGE", "3600"))
    AUTH_TOKEN_SALT = os.getenv("NOVA_AUTH_TOKEN_SALT", "nova-auth-token")
    REGISTRATION_CODE_MAX_AGE = int(os.getenv("NOVA_REGISTRATION_CODE_MAX_AGE", "600"))
    EMAIL_API_URL = os.getenv("NOVA_EMAIL_API_URL", "")
    EMAIL_API_TOKEN = os.getenv("NOVA_EMAIL_API_TOKEN", "")
    EMAIL_CUSTOM_AUTH = os.getenv("NOVA_EMAIL_CUSTOM_AUTH", "")
    EMAIL_FROM_NAME = os.getenv("NOVA_EMAIL_FROM_NAME", "Bocchi")
    EMAIL_DEBUG = os.getenv("NOVA_EMAIL_DEBUG", "true").lower() == "true"
    ADMIN_USERNAME = os.getenv("NOVA_ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("NOVA_ADMIN_PASSWORD", "admin")
    ADMIN_TOKEN_SALT = os.getenv("NOVA_ADMIN_TOKEN_SALT", "bocchi-admin-token")
    ADMIN_ACCESS_TOKEN_MAX_AGE = int(os.getenv("NOVA_ADMIN_ACCESS_TOKEN_MAX_AGE", "3600"))

