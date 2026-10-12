from __future__ import annotations

import gzip
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, current_app, g
from werkzeug.security import generate_password_hash

from .tool_management import ensure_tool_settings

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, tool_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tool_settings (
    tool_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id TEXT NOT NULL,
    user_id TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_created
ON tool_usage_events(tool_id, created_at);

CREATE INDEX IF NOT EXISTS idx_tool_usage_created
ON tool_usage_events(created_at);

CREATE TABLE IF NOT EXISTS admins (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS emoji_combinations (
    left_emoji TEXT NOT NULL,
    right_emoji TEXT NOT NULL,
    data_version TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    PRIMARY KEY (left_emoji, right_emoji)
);

CREATE TABLE IF NOT EXISTS registration_codes (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS filebox_items (
    code TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    text_content TEXT,
    file_path TEXT,
    expire_style TEXT NOT NULL,
    expire_value INTEGER NOT NULL,
    expires_at TEXT,
    remaining_downloads INTEGER,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_filebox_items_expires_at
ON filebox_items(expires_at);

CREATE TABLE IF NOT EXISTS shares (
    code TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    content_json TEXT NOT NULL,
    user_id TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_shares_user_created
ON shares(user_id, created_at);

CREATE TABLE IF NOT EXISTS password_reset_codes (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emoji_combinations_left
ON emoji_combinations(left_emoji);
"""


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect_db(app: Flask) -> sqlite3.Connection:
    if "db" not in g:
        database_path = os.path.abspath(str(app.config["DATABASE"]))
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        g.db = connection

    return g.db


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        return connect_db(current_app)
    return g.db


def close_db(_error: BaseException | None = None) -> None:
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def load_emoji_combinations(connection: sqlite3.Connection, data_path: str) -> None:
    existing = connection.execute(
        "SELECT COUNT(*) AS count FROM emoji_combinations"
    ).fetchone()
    if existing and int(existing["count"]) > 0:
        return

    path = Path(data_path)
    if not path.exists():
        return

    with gzip.open(path, "rt", encoding="utf-8") as handle:
        records = json.load(handle)

    latest = {}
    for item in records:
        parts = str(item.get("id", "")).split("/")
        if len(parts) != 2:
            continue

        members = parts[1].split("_")
        if len(members) < 2:
            continue

        left, right = members[0], members[1]
        key = tuple(sorted((left, right)))
        current = latest.get(key)
        if current is None or str(item["data"]) > str(current["data"]):
            latest[key] = {"data": str(item["data"]), "id": str(item["id"])}

    rows = [
        (left, right, item["data"], item["id"])
        for (left, right), item in latest.items()
    ]
    connection.executemany(
        """
        INSERT INTO emoji_combinations
            (left_emoji, right_emoji, data_version, resource_id)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(left_emoji, right_emoji) DO UPDATE SET
            data_version = excluded.data_version,
            resource_id = excluded.resource_id
        """,
        rows,
    )
    connection.commit()

def init_database(app: Flask) -> None:
    with app.app_context():
        connection = connect_db(app)
        connection.executescript(SCHEMA)
        connection.execute("PRAGMA journal_mode = WAL")
        columns = {str(row["name"]) for row in connection.execute("PRAGMA table_info(users)")}
        if "avatar" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT ''")

        admin_columns = {str(row["name"]) for row in connection.execute("PRAGMA table_info(admins)")}
        if "display_name" not in admin_columns:
            connection.execute("ALTER TABLE admins ADD COLUMN display_name TEXT NOT NULL DEFAULT ''")
        if "avatar" not in admin_columns:
            connection.execute("ALTER TABLE admins ADD COLUMN avatar TEXT NOT NULL DEFAULT ''")

        user_id = str(app.config["DEMO_USER_ID"])
        existing = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

        if existing is None:
            connection.execute(
                """
                INSERT INTO users (id, email, name, role, avatar, password_hash, created_at)
                VALUES (?, ?, ?, ?, '', ?, ?)
                """,
                (
                    user_id,
                    str(app.config["DEMO_EMAIL"]).strip().lower(),
                    str(app.config["DEMO_USER_NAME"]),
                    str(app.config["DEMO_USER_ROLE"]),
                    generate_password_hash(str(app.config["DEMO_PASSWORD"])),
                    _utc_now(),
                ),
            )

        ensure_tool_settings(connection)

        admin_username = str(app.config["ADMIN_USERNAME"])
        admin_exists = connection.execute(
            "SELECT username FROM admins WHERE username = ?",
            (admin_username,),
        ).fetchone()
        if admin_exists is None:
            now = _utc_now()
            connection.execute(
                """
                INSERT INTO admins
                    (username, password_hash, display_name, avatar, must_change_password, created_at, updated_at)
                VALUES (?, ?, ?, '', 1, ?, ?)
                """,
                (
                    admin_username,
                    generate_password_hash(str(app.config["ADMIN_PASSWORD"])),
                    "管理员",
                    now,
                    now,
                ),
            )

        connection.commit()
        if app.config.get("IMPORT_EMOJI_DATA", True):
            load_emoji_combinations(connection, str(app.config["EMOJI_DATA_PATH"]))

def init_app(app: Flask) -> None:
    app.teardown_appcontext(close_db)
    init_database(app)
