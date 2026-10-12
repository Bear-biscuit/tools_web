from __future__ import annotations

import re
from typing import Any, Tuple

from flask import Blueprint, current_app, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from ..db import get_db
from ..filebox import delete_share
from ..repositories import AdminRepository, UserRepository
from ..tool_management import list_tool_settings, set_tool_enabled, tool_usage_stats
from .service import (
    Admin,
    AdminService,
    InvalidAdminCredentialsError,
    InvalidAdminTokenError,
)

admin_blueprint = Blueprint("admin", __name__)

AVATAR_PATTERN = re.compile(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")


def _service() -> AdminService:
    config = current_app.config
    return AdminService(
        repository=AdminRepository(get_db()),
        secret_key=config["SECRET_KEY"],
        token_salt=config["ADMIN_TOKEN_SALT"],
        token_max_age=config["ADMIN_ACCESS_TOKEN_MAX_AGE"],
    )


def _error(code: str, message: str, status: int) -> Tuple[Any, int]:
    return jsonify({"error": {"code": code, "message": message}}), status


def _current_admin() -> Tuple[Admin | None, Any | None]:
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None, _error("missing_admin_token", "缺少管理员登录凭证。", 401)
    try:
        return _service().get_admin_from_token(token), None
    except InvalidAdminTokenError:
        return None, _error("invalid_admin_token", "管理员登录已失效，请重新登录。", 401)


def _admin_ready() -> Tuple[Admin | None, Any | None]:
    admin, error = _current_admin()
    if error:
        return None, error
    assert admin is not None
    if admin.must_change_password:
        return None, _error(
            "password_change_required",
            "首次登录必须修改管理员密码后才能继续操作。",
            403,
        )
    return admin, None


@admin_blueprint.post("/login")
def admin_login():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    username = payload.get("username")
    password = payload.get("password")
    if not isinstance(username, str) or not isinstance(password, str):
        return _error("validation_error", "管理员账号和密码不能为空。", 422)

    try:
        admin = _service().authenticate(username, password)
    except InvalidAdminCredentialsError:
        return _error("invalid_admin_credentials", "管理员账号或密码错误。", 401)

    return jsonify(
        {
            "accessToken": _service().issue_token(admin.username),
            "tokenType": "Bearer",
            "expiresIn": current_app.config["ADMIN_ACCESS_TOKEN_MAX_AGE"],
            "admin": admin.to_dict(),
        }
    )


@admin_blueprint.get("/session")
def admin_session():
    admin, error = _current_admin()
    if error:
        return error
    return jsonify({"admin": admin.to_dict()})


@admin_blueprint.put("/password")
def admin_update_password():
    admin, error = _current_admin()
    if error:
        return error
    assert admin is not None

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    current_password = payload.get("currentPassword")
    new_password = payload.get("newPassword")
    if not isinstance(current_password, str) or not isinstance(new_password, str):
        return _error("validation_error", "当前密码和新密码不能为空。", 422)
    if len(new_password) < 8:
        return _error("validation_error", "新密码至少需要 8 个字符。", 422)
    if current_password == new_password:
        return _error("validation_error", "新密码不能与当前密码相同。", 422)

    repository = AdminRepository(get_db())
    row = repository.get(admin.username)
    if row is None or not check_password_hash(str(row["password_hash"]), current_password):
        return _error("invalid_current_password", "当前密码不正确。", 422)

    repository.update_password(admin.username, generate_password_hash(new_password))
    return jsonify({"message": "管理员密码已更新。"})


@admin_blueprint.put("/profile")
def admin_update_profile():
    admin, error = _admin_ready()
    if error:
        return error
    assert admin is not None

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    display_name = payload.get("displayName")
    avatar = payload.get("avatar", "")
    if not isinstance(display_name, str) or not display_name.strip():
        return _error("validation_error", "名称不能为空。", 422)
    if len(display_name.strip()) > 40:
        return _error("validation_error", "名称不能超过 40 个字符。", 422)
    if not isinstance(avatar, str):
        return _error("validation_error", "头像格式不正确。", 422)
    if avatar and not AVATAR_PATTERN.fullmatch(avatar):
        return _error("validation_error", "头像必须是 PNG、JPG 或 WebP 图片。", 422)
    if len(avatar) > 1_500_000:
        return _error("avatar_too_large", "头像文件过大，请重新压缩。", 413)

    AdminRepository(get_db()).update_profile(
        admin.username,
        display_name=display_name.strip(),
        avatar=avatar,
    )
    updated = _service().get_admin(admin.username)
    return jsonify({"admin": updated.to_dict()})

@admin_blueprint.get("/usage")
def admin_usage():
    _admin, error = _admin_ready()
    if error:
        return error
    try:
        days = int(request.args.get("days", "30"))
    except ValueError:
        days = 30
    return jsonify(tool_usage_stats(get_db(), days))


@admin_blueprint.delete("/usage")
def admin_reset_usage():
    _admin, error = _admin_ready()
    if error:
        return error
    connection = get_db()
    connection.execute("DELETE FROM tool_usage_events")
    connection.commit()
    return "", 204


@admin_blueprint.get("/tools")
def admin_tools():
    _admin, error = _admin_ready()
    if error:
        return error
    return jsonify({"tools": tool_usage_stats(get_db(), 30)["tools"]})


@admin_blueprint.put("/tools/<tool_id>")
def admin_update_tool(tool_id: str):
    _admin, error = _admin_ready()
    if error:
        return error
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("enabled"), bool):
        return _error("invalid_request", "请求体必须包含 enabled 布尔值。", 400)
    if not set_tool_enabled(get_db(), tool_id, bool(payload["enabled"])):
        return _error("tool_not_found", "没有找到这个工具。", 404)
    return jsonify({"toolId": tool_id, "enabled": bool(payload["enabled"])})


@admin_blueprint.get("/dashboard")
def admin_dashboard():
    _admin, error = _admin_ready()
    if error:
        return error

    connection = get_db()
    tables = {
        "users": "users",
        "favorites": "favorites",
        "preferences": "preferences",
        "fileboxItems": "filebox_items",
        "emojiCombinations": "emoji_combinations",
    }
    counts = {
        key: int(connection.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()["count"])
        for key, table in tables.items()
    }
    return jsonify({"counts": counts})


@admin_blueprint.get("/users")
def admin_users():
    _admin, error = _admin_ready()
    if error:
        return error

    rows = get_db().execute(
        """
        SELECT u.id, u.email, u.name, u.role, u.avatar, u.created_at,
               COUNT(f.tool_id) AS favorite_count
        FROM users u
        LEFT JOIN favorites f ON f.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
        """
    ).fetchall()
    return jsonify(
        {
            "users": [
                {
                    "id": str(row["id"]),
                    "email": str(row["email"]),
                    "name": str(row["name"]),
                    "role": str(row["role"]),
                    "avatar": str(row["avatar"] or ""),
                    "createdAt": str(row["created_at"]),
                    "favoriteCount": int(row["favorite_count"]),
                }
                for row in rows
            ]
        }
    )


@admin_blueprint.delete("/users/<user_id>")
def admin_delete_user(user_id: str):
    _admin, error = _admin_ready()
    if error:
        return error
    UserRepository(get_db()).delete(user_id)
    return "", 204


@admin_blueprint.get("/filebox")
def admin_filebox():
    _admin, error = _admin_ready()
    if error:
        return error

    rows = get_db().execute(
        """
        SELECT code, kind, name, size, expire_style, expires_at,
               remaining_downloads, created_at
        FROM filebox_items
        ORDER BY created_at DESC
        """
    ).fetchall()
    return jsonify(
        {
            "items": [
                {
                    "code": str(row["code"]),
                    "kind": str(row["kind"]),
                    "name": str(row["name"]),
                    "size": int(row["size"]),
                    "expireStyle": str(row["expire_style"]),
                    "expiresAt": row["expires_at"],
                    "remainingDownloads": row["remaining_downloads"],
                    "createdAt": str(row["created_at"]),
                }
                for row in rows
            ]
        }
    )


@admin_blueprint.delete("/filebox/<code>")
def admin_delete_filebox(code: str):
    _admin, error = _admin_ready()
    if error:
        return error
    if not delete_share(code):
        return _error("pickup_not_found", "没有找到这个文件柜项目。", 404)
    return "", 204
