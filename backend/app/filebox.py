from __future__ import annotations

import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional, Tuple

from flask import current_app

from .db import get_db

PICKUP_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
VALID_EXPIRE_STYLES = {"minute", "hour", "day", "count", "forever"}
MAX_CODE_ATTEMPTS = 24


class FileBoxError(Exception):
    def __init__(self, code: str, message: str, status: int = 422) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


@dataclass(frozen=True)
class ClaimedShare:
    code: str
    kind: str
    name: str
    mime_type: str
    size: int
    text: Optional[str]
    file_path: Optional[str]
    remaining_downloads: Optional[int]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime) -> str:
    return value.isoformat()


def _parse_time(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    parsed = datetime.fromisoformat(str(value))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def normalize_code(value: str) -> str:
    return "".join(character for character in str(value or "").upper() if character.isalnum())


def _storage_root() -> Path:
    root = Path(str(current_app.config["FILEBOX_DIR"])).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _resolve_expiry(expire_value: Any, expire_style: Any) -> Tuple[Optional[str], Optional[int]]:
    style = str(expire_style or "day").strip().lower()
    if style not in VALID_EXPIRE_STYLES:
        raise FileBoxError("invalid_expire_style", "不支持这个有效期类型。")

    if style == "forever":
        return None, None

    try:
        value = int(expire_value)
    except (TypeError, ValueError):
        raise FileBoxError("invalid_expire_value", "有效期必须是正整数。")

    if value <= 0:
        raise FileBoxError("invalid_expire_value", "有效期必须是正整数。")

    if style == "count":
        return None, value

    units = {
        "minute": timedelta(minutes=value),
        "hour": timedelta(hours=value),
        "day": timedelta(days=value),
    }
    return _iso(_now() + units[style]), None


def _generate_code(connection: Any) -> str:
    for _ in range(MAX_CODE_ATTEMPTS):
        code = "".join(secrets.choice(PICKUP_ALPHABET) for _ in range(6))
        exists = connection.execute(
            "SELECT 1 FROM filebox_items WHERE code = ?",
            (code,),
        ).fetchone()
        if exists is None:
            return code
    raise FileBoxError("pickup_code_exhausted", "暂时无法生成取件码，请稍后重试。", 503)


def _share_summary(row: Any) -> dict:
    code = str(row["code"])
    return {
        "code": code,
        "kind": str(row["kind"]),
        "name": str(row["name"]),
        "mimeType": str(row["mime_type"]),
        "size": int(row["size"]),
        "expireStyle": str(row["expire_style"]),
        "expireValue": int(row["expire_value"]),
        "createdAt": str(row["created_at"]),
        "expiresAt": row["expires_at"],
        "remainingDownloads": row["remaining_downloads"],
        "claimUrl": f"/api/tools/filebox/claim/{code}",
    }


def _is_expired(row: Any, now: datetime) -> bool:
    remaining = row["remaining_downloads"]
    if remaining is not None and int(remaining) <= 0:
        return True

    expires_at = _parse_time(row["expires_at"])
    return expires_at is not None and expires_at <= now


def _remove_file(root: Path, relative_path: Any) -> None:
    if not relative_path:
        return

    target = (root / str(relative_path)).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        return

    try:
        target.unlink(missing_ok=True)
    except OSError:
        pass


def cleanup_expired() -> int:
    connection = get_db()
    root = _storage_root()
    now = _now()
    rows = connection.execute("SELECT * FROM filebox_items").fetchall()
    expired = [row for row in rows if _is_expired(row, now)]

    for row in expired:
        _remove_file(root, row["file_path"])
        connection.execute("DELETE FROM filebox_items WHERE code = ?", (row["code"],))

    if expired:
        connection.commit()
    return len(expired)


def create_text_share(text: str, expire_value: Any, expire_style: Any) -> dict:
    content = str(text or "")
    if not content.strip():
        raise FileBoxError("empty_text", "请输入要寄送的文本。")

    size = len(content.encode("utf-8"))
    maximum = int(current_app.config["FILEBOX_MAX_TEXT_BYTES"])
    if size > maximum:
        raise FileBoxError("text_too_large", "文本过长，请改用文件寄送。", 413)

    expires_at, remaining = _resolve_expiry(expire_value, expire_style)
    connection = get_db()
    code = _generate_code(connection)
    connection.execute(
        """
        INSERT INTO filebox_items
            (code, kind, name, mime_type, size, text_content, file_path,
             expire_style, expire_value, expires_at, remaining_downloads, created_at)
        VALUES (?, 'text', ?, 'text/plain; charset=utf-8', ?, ?, NULL, ?, ?, ?, ?, ?)
        """,
        (
            code,
            "寄送内容.txt",
            size,
            content,
            str(expire_style or "day").strip().lower(),
            int(expire_value) if str(expire_style or "day").strip().lower() != "forever" else 0,
            expires_at,
            remaining,
            _iso(_now()),
        ),
    )
    connection.commit()
    row = connection.execute("SELECT * FROM filebox_items WHERE code = ?", (code,)).fetchone()
    return _share_summary(row)


def create_file_share(file_storage: Any, expire_value: Any, expire_style: Any) -> dict:
    expires_at, remaining = _resolve_expiry(expire_value, expire_style)
    original_name = Path(str(getattr(file_storage, "filename", "") or "文件")).name[:180]
    if not original_name:
        original_name = "文件"

    maximum = int(current_app.config["FILEBOX_MAX_UPLOAD_BYTES"])
    root = _storage_root()
    stored_name = uuid.uuid4().hex
    temporary_path = root / f".{stored_name}.upload"
    final_path = root / stored_name
    size = 0

    try:
        with temporary_path.open("wb") as output:
            while True:
                chunk = file_storage.stream.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > maximum:
                    raise FileBoxError("file_too_large", "文件超过当前上传大小限制。", 413)
                output.write(chunk)

        if size == 0:
            raise FileBoxError("empty_file", "不能寄送空文件。")

        temporary_path.replace(final_path)
        mime_type = str(getattr(file_storage, "mimetype", "") or "application/octet-stream")
        connection = get_db()
        code = _generate_code(connection)
        connection.execute(
            """
            INSERT INTO filebox_items
                (code, kind, name, mime_type, size, text_content, file_path,
                 expire_style, expire_value, expires_at, remaining_downloads, created_at)
            VALUES (?, 'file', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
            """,
            (
                code,
                original_name,
                mime_type,
                size,
                stored_name,
                str(expire_style or "day").strip().lower(),
                int(expire_value) if str(expire_style or "day").strip().lower() != "forever" else 0,
                expires_at,
                remaining,
                _iso(_now()),
            ),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM filebox_items WHERE code = ?", (code,)).fetchone()
        return _share_summary(row)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        final_path.unlink(missing_ok=True)
        raise


def delete_share(code: str) -> bool:
    connection = get_db()
    normalized = normalize_code(code)
    row = connection.execute(
        "SELECT file_path FROM filebox_items WHERE code = ?",
        (normalized,),
    ).fetchone()
    if row is None:
        return False

    _remove_file(_storage_root(), row["file_path"])
    connection.execute("DELETE FROM filebox_items WHERE code = ?", (normalized,))
    connection.commit()
    return True


def inspect_share(code: str) -> dict:
    cleanup_expired()
    normalized = normalize_code(code)
    if len(normalized) != 6:
        raise FileBoxError("invalid_pickup_code", "取件码应为 6 位字母或数字。")

    row = get_db().execute(
        "SELECT * FROM filebox_items WHERE code = ?",
        (normalized,),
    ).fetchone()
    if row is None:
        raise FileBoxError("pickup_not_found", "没有找到这个取件码。", 404)

    return _share_summary(row)


def claim_share(code: str) -> ClaimedShare:
    cleanup_expired()
    normalized = normalize_code(code)
    if len(normalized) != 6:
        raise FileBoxError("invalid_pickup_code", "取件码应为 6 位字母或数字。")

    connection = get_db()
    connection.execute("BEGIN IMMEDIATE")
    row = connection.execute(
        "SELECT * FROM filebox_items WHERE code = ?",
        (normalized,),
    ).fetchone()

    if row is None:
        connection.rollback()
        raise FileBoxError("pickup_not_found", "没有找到这个取件码。", 404)

    if _is_expired(row, _now()):
        connection.rollback()
        cleanup_expired()
        raise FileBoxError("pickup_expired", "这个取件码已经过期。", 410)

    remaining = row["remaining_downloads"]
    next_remaining = int(remaining) - 1 if remaining is not None else None
    if next_remaining is not None:
        connection.execute(
            "UPDATE filebox_items SET remaining_downloads = ? WHERE code = ?",
            (next_remaining, normalized),
        )
    connection.commit()

    if row["kind"] == "file":
        root = _storage_root()
        file_path = (root / str(row["file_path"])).resolve()
        try:
            file_path.relative_to(root)
        except ValueError:
            raise FileBoxError("invalid_storage_path", "文件存储路径无效。", 500)
        if not file_path.is_file():
            connection.execute("DELETE FROM filebox_items WHERE code = ?", (normalized,))
            connection.commit()
            raise FileBoxError("file_missing", "文件内容已不存在。", 410)
        resolved_path = str(file_path)
    else:
        resolved_path = None

    return ClaimedShare(
        code=normalized,
        kind=str(row["kind"]),
        name=str(row["name"]),
        mime_type=str(row["mime_type"]),
        size=int(row["size"]),
        text=row["text_content"],
        file_path=resolved_path,
        remaining_downloads=next_remaining,
    )
