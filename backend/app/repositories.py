from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, List, Optional


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class UserRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def find_by_email(self, email: str) -> Optional[sqlite3.Row]:
        return self._connection.execute(
            "SELECT * FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()

    def get(self, user_id: str) -> Optional[sqlite3.Row]:
        return self._connection.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    def create(
        self,
        *,
        user_id: str,
        email: str,
        name: str,
        role: str,
        password_hash: str,
        avatar: str = "",
    ) -> None:
        self._connection.execute(
            """
            INSERT INTO users (id, email, name, role, avatar, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, email.strip().lower(), name.strip(), role, avatar, password_hash, _utc_now()),
        )
        self._connection.commit()

    def update_profile(self, user_id: str, *, name: str, avatar: str) -> None:
        self._connection.execute(
            "UPDATE users SET name = ?, avatar = ? WHERE id = ?",
            (name.strip(), avatar, user_id),
        )
        self._connection.commit()

    def update_password(self, user_id: str, password_hash: str) -> None:
        self._connection.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (password_hash, user_id),
        )
        self._connection.commit()

    def list_all(self) -> List[sqlite3.Row]:
        return self._connection.execute(
            "SELECT id, email, name, role, avatar, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()

    def delete(self, user_id: str) -> None:
        self._connection.execute("DELETE FROM users WHERE id = ?", (user_id,))
        self._connection.commit()


class AdminRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def get(self, username: str) -> Optional[sqlite3.Row]:
        return self._connection.execute(
            "SELECT * FROM admins WHERE username = ?",
            (username.strip(),),
        ).fetchone()

    def update_profile(self, username: str, *, display_name: str, avatar: str) -> None:
        self._connection.execute(
            """
            UPDATE admins
            SET display_name = ?, avatar = ?, updated_at = ?
            WHERE username = ?
            """,
            (display_name.strip(), avatar, _utc_now(), username.strip()),
        )
        self._connection.commit()

    def update_password(self, username: str, password_hash: str) -> None:
        self._connection.execute(
            """
            UPDATE admins
            SET password_hash = ?, must_change_password = 0, updated_at = ?
            WHERE username = ?
            """,
            (password_hash, _utc_now(), username.strip()),
        )
        self._connection.commit()


class FavoriteRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def list_tool_ids(self, user_id: str) -> List[str]:
        rows = self._connection.execute(
            "SELECT tool_id FROM favorites WHERE user_id = ? ORDER BY created_at",
            (user_id,),
        ).fetchall()
        return [str(row["tool_id"]) for row in rows]

    def add(self, user_id: str, tool_id: str) -> None:
        self._connection.execute(
            """
            INSERT INTO favorites (user_id, tool_id, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, tool_id) DO NOTHING
            """,
            (user_id, tool_id, _utc_now()),
        )
        self._connection.commit()

    def remove(self, user_id: str, tool_id: str) -> None:
        self._connection.execute(
            "DELETE FROM favorites WHERE user_id = ? AND tool_id = ?",
            (user_id, tool_id),
        )
        self._connection.commit()


class PreferenceRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def get(self, user_id: str, key: str) -> Optional[Any]:
        row = self._connection.execute(
            "SELECT value_json FROM preferences WHERE user_id = ? AND key = ?",
            (user_id, key),
        ).fetchone()
        return json.loads(row["value_json"]) if row else None

    def set(self, user_id: str, key: str, value: Any) -> None:
        self._connection.execute(
            """
            INSERT INTO preferences (user_id, key, value_json, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET
                value_json = excluded.value_json,
                updated_at = excluded.updated_at
            """,
            (user_id, key, json.dumps(value, ensure_ascii=False), _utc_now()),
        )
        self._connection.commit()
class EmojiRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def find_pair(self, left: str, right: str) -> Optional[sqlite3.Row]:
        return self._connection.execute(
            """
            SELECT left_emoji, right_emoji, data_version, resource_id
            FROM emoji_combinations
            WHERE (left_emoji = ? AND right_emoji = ?)
               OR (left_emoji = ? AND right_emoji = ?)
            LIMIT 1
            """,
            (left, right, right, left),
        ).fetchone()

    def random_pair(self) -> Optional[sqlite3.Row]:
        return self._connection.execute(
            """
            SELECT left_emoji, right_emoji, data_version, resource_id
            FROM emoji_combinations
            ORDER BY RANDOM()
            LIMIT 1
            """
        ).fetchone()
class RegistrationCodeRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def upsert(
        self,
        *,
        email: str,
        name: str,
        code_hash: str,
        expires_at: str,
    ) -> None:
        self._connection.execute(
            """
            INSERT INTO registration_codes
                (email, name, code_hash, expires_at, attempts, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
            ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                code_hash = excluded.code_hash,
                expires_at = excluded.expires_at,
                attempts = 0,
                created_at = excluded.created_at
            """,
            (email.strip().lower(), name.strip(), code_hash, expires_at, _utc_now()),
        )
        self._connection.commit()

    def get(self, email: str) -> Optional[sqlite3.Row]:
        return self._connection.execute(
            "SELECT * FROM registration_codes WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()

    def increment_attempts(self, email: str) -> None:
        self._connection.execute(
            "UPDATE registration_codes SET attempts = attempts + 1 WHERE email = ?",
            (email.strip().lower(),),
        )
        self._connection.commit()

    def delete(self, email: str) -> None:
        self._connection.execute(
            "DELETE FROM registration_codes WHERE email = ?",
            (email.strip().lower(),),
        )
        self._connection.commit()

class ShareRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def create(
        self,
        *,
        code: str,
        kind: str,
        title: str,
        content_json: str,
        user_id: str | None = None,
        expires_at: str | None = None,
    ) -> None:
        self._connection.execute(
            """
            INSERT INTO shares
                (code, kind, title, content_json, user_id, created_at, expires_at, view_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            """,
            (code, kind, title, content_json, user_id, _utc_now(), expires_at),
        )
        self._connection.commit()

    def get(self, code: str) -> Optional[sqlite3.Row]:
        return self._connection.execute(
            "SELECT * FROM shares WHERE code = ?",
            (code.strip(),),
        ).fetchone()

    def list_by_user(self, user_id: str) -> List[sqlite3.Row]:
        return self._connection.execute(
            "SELECT * FROM shares WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()

    def delete(self, code: str, user_id: str) -> bool:
        cursor = self._connection.execute(
            "DELETE FROM shares WHERE code = ? AND user_id = ?",
            (code.strip(), user_id),
        )
        self._connection.commit()
        return cursor.rowcount > 0

    def increment_view(self, code: str) -> None:
        self._connection.execute(
            "UPDATE shares SET view_count = view_count + 1 WHERE code = ?",
            (code.strip(),),
        )
        self._connection.commit()


class PasswordResetCodeRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    def upsert(
        self,
        *,
        email: str,
        name: str,
        code_hash: str,
        expires_at: str,
    ) -> None:
        self._connection.execute(
            """
            INSERT INTO password_reset_codes
                (email, name, code_hash, expires_at, attempts, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
            ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                code_hash = excluded.code_hash,
                expires_at = excluded.expires_at,
                attempts = 0,
                created_at = excluded.created_at
            """,
            (email.strip().lower(), name.strip(), code_hash, expires_at, _utc_now()),
        )
        self._connection.commit()

    def get(self, email: str) -> Optional[sqlite3.Row]:
        return self._connection.execute(
            "SELECT * FROM password_reset_codes WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()

    def increment_attempts(self, email: str) -> None:
        self._connection.execute(
            "UPDATE password_reset_codes SET attempts = attempts + 1 WHERE email = ?",
            (email.strip().lower(),),
        )
        self._connection.commit()

    def delete(self, email: str) -> None:
        self._connection.execute(
            "DELETE FROM password_reset_codes WHERE email = ?",
            (email.strip().lower(),),
        )
        self._connection.commit()
