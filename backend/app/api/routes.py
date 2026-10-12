from __future__ import annotations

import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Tuple
from urllib.request import Request, urlopen

from flask import Blueprint, Response, current_app, jsonify, request, send_file
from werkzeug.security import check_password_hash, generate_password_hash

from ..auth.service import AuthService, InvalidCredentialsError, InvalidTokenError, User
from ..db import get_db
from ..email_service import EmailDeliveryError, send_password_reset_email, send_verification_email
from ..hok_power import HokPowerError, get_heroes as get_hok_heroes, query_hero_power
from ..filebox import (
    FileBoxError,
    claim_share,
    cleanup_expired,
    create_file_share,
    create_text_share,
    inspect_share,
)
from ..tool_management import TOOL_IDS, TOOL_LABELS, is_tool_enabled, list_tool_settings, record_tool_usage
from ..rate_limit import RateLimiter, client_ip
from ..repositories import (
    EmojiRepository,
    FavoriteRepository,
    PasswordResetCodeRepository,
    PreferenceRepository,
    RegistrationCodeRepository,
    ShareRepository,
    UserRepository,
)

api_blueprint = Blueprint("api", __name__)
SAFE_KEY_PATTERN = re.compile(r"^[a-z0-9_.-]{1,64}$")
EMOJI_ID_PATTERN = re.compile(r"^u[0-9a-f-]{2,80}$")
AVATAR_PATTERN = re.compile(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")


def _login_limiter() -> RateLimiter:
    return current_app.extensions["login_limiter"]


def _email_code_limiter() -> RateLimiter:
    return current_app.extensions["email_code_limiter"]


def _service() -> AuthService:
    config = current_app.config
    return AuthService(
        user_repository=UserRepository(get_db()),
        secret_key=config["SECRET_KEY"],
        token_salt=config["AUTH_TOKEN_SALT"],
        token_max_age=config["ACCESS_TOKEN_MAX_AGE"],
    )


def _error(code: str, message: str, status: int) -> Tuple[Any, int]:
    return jsonify({"error": {"code": code, "message": message}}), status


def _current_user() -> Tuple[User | None, Any | None]:
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        return None, _error("missing_token", "缺少有效的 Bearer Token。", 401)

    try:
        return _service().get_user_from_token(token), None
    except InvalidTokenError:
        return None, _error("invalid_token", "登录状态已失效，请重新登录。", 401)


def _valid_key(value: str) -> bool:
    return bool(SAFE_KEY_PATTERN.fullmatch(value))


def _emoji_glyph(emoji_id: str) -> str:
    codepoints = []
    for token in emoji_id.split("-"):
        if token.startswith("u"):
            try:
                codepoints.append(int(token[1:], 16))
            except ValueError:
                return ""
    return "".join(chr(codepoint) for codepoint in codepoints)


def _emoji_response(row: Any) -> dict:
    left = str(row["left_emoji"])
    right = str(row["right_emoji"])
    return {
        "supported": True,
        "left": left,
        "right": right,
        "dataVersion": str(row["data_version"]),
        "resourceId": str(row["resource_id"]),
        "imageUrl": f"/api/tools/emoji/image?left={left}&right={right}",
    }


@api_blueprint.get("/tools/emoji/list")
def emoji_list():
    path = Path(str(current_app.config["EMOJI_LIST_PATH"]))
    if not path.exists():
        return _error("emoji_data_missing", "Emoji 列表数据不存在。", 503)

    emoji_ids = json.loads(path.read_text(encoding="utf-8"))
    return jsonify(
        {
            "emojis": [
                {"id": emoji_id, "glyph": _emoji_glyph(str(emoji_id))}
                for emoji_id in emoji_ids
                if _emoji_glyph(str(emoji_id))
            ]
        }
    )


@api_blueprint.get("/tools/emoji/combine")
def emoji_combine():
    left = request.args.get("left", "")
    right = request.args.get("right", "")

    if not EMOJI_ID_PATTERN.fullmatch(left) or not EMOJI_ID_PATTERN.fullmatch(right):
        return _error("validation_error", "Emoji 标识格式不正确。", 422)

    row = EmojiRepository(get_db()).find_pair(left, right)
    if row is None:
        return _error("emoji_combination_not_found", "暂无该 Emoji 组合。", 404)

    return jsonify(_emoji_response(row))


@api_blueprint.get("/tools/emoji/random")
def emoji_random():
    row = EmojiRepository(get_db()).random_pair()
    if row is None:
        return _error("emoji_combinations_empty", "Emoji 组合数据为空。", 503)
    return jsonify(_emoji_response(row))


@api_blueprint.get("/tools/emoji/image")
def emoji_image():
    left = request.args.get("left", "")
    right = request.args.get("right", "")

    if not EMOJI_ID_PATTERN.fullmatch(left) or not EMOJI_ID_PATTERN.fullmatch(right):
        return _error("validation_error", "Emoji 标识格式不正确。", 422)

    row = EmojiRepository(get_db()).find_pair(left, right)
    if row is None:
        return _error("emoji_combination_not_found", "暂无该 Emoji 组合。", 404)

    upstream_url = (
        "https://www.gstatic.com/android/keyboard/emojikitchen/"
        f"{row['data_version']}/{row['resource_id']}.png"
    )

    try:
        upstream_request = Request(
            upstream_url,
            headers={"User-Agent": "Nova-Tools/1.0"},
        )
        with urlopen(upstream_request, timeout=12) as upstream:
            image_data = upstream.read()
            content_type = upstream.headers.get_content_type() or "image/png"
    except Exception:
        return _error("emoji_image_unavailable", "Emoji 图片暂时无法获取。", 502)

    response = Response(image_data, mimetype=content_type)
    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response

@api_blueprint.get("/tools/status")
def tools_status():
    return jsonify({"tools": list_tool_settings(get_db())})


@api_blueprint.post("/tools/usage")
def tools_usage():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    tool_id = payload.get("toolId")
    if not isinstance(tool_id, str) or tool_id not in TOOL_IDS:
        return _error("validation_error", "工具标识不正确。", 422)
    if not is_tool_enabled(get_db(), tool_id):
        return _error("tool_paused", "这个工具当前已暂停。", 423)

    user_id = None
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token:
        try:
            user_id = _service().get_user_from_token(token).id
        except InvalidTokenError:
            user_id = None

    record_tool_usage(get_db(), tool_id, user_id)
    return "", 204


@api_blueprint.get("/health")
def health():
    return jsonify({"status": "ok", "service": "nova-tools-api"})


@api_blueprint.get("/tools/hok-power/heroes")
def hok_power_heroes():
    source_id = request.args.get("source", "auto")
    try:
        return jsonify(get_hok_heroes(source_id))
    except HokPowerError as error:
        return _error("hok_power_error", error.message, error.status_code)


@api_blueprint.get("/tools/hok-power/query")
def hok_power_query():
    hero = request.args.get("hero", "")
    hero_type = request.args.get("type", "aqq")
    source_id = request.args.get("source", "auto")
    try:
        return jsonify(query_hero_power(hero, hero_type, source_id))
    except HokPowerError as error:
        return _error("hok_power_error", error.message, error.status_code)


@api_blueprint.get("/tools/filebox/status")
def filebox_status():
    removed = cleanup_expired()
    connection = get_db()
    active_count = connection.execute("SELECT COUNT(*) AS count FROM filebox_items").fetchone()
    return jsonify(
        {
            "available": True,
            "provider": "nova-local",
            "activeItems": int(active_count["count"]) if active_count else 0,
            "removedExpired": removed,
            "maxUploadBytes": int(current_app.config["FILEBOX_MAX_UPLOAD_BYTES"]),
            "maxTextBytes": int(current_app.config["FILEBOX_MAX_TEXT_BYTES"]),
        }
    )


@api_blueprint.post("/tools/filebox/text")
def filebox_create_text():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    try:
        share = create_text_share(
            str(payload.get("text") or ""),
            payload.get("expireValue", 1),
            payload.get("expireStyle", "day"),
        )
    except FileBoxError as error:
        return _error(error.code, error.message, error.status)

    return jsonify({"share": share}), 201


@api_blueprint.post("/tools/filebox/file")
def filebox_create_file():
    uploaded = request.files.get("file")
    if uploaded is None:
        return _error("file_required", "请选择要寄送的文件。", 422)

    try:
        share = create_file_share(
            uploaded,
            request.form.get("expireValue", "1"),
            request.form.get("expireStyle", "day"),
        )
    except FileBoxError as error:
        return _error(error.code, error.message, error.status)

    return jsonify({"share": share}), 201


@api_blueprint.post("/tools/filebox/inspect")
def filebox_inspect():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    try:
        share = inspect_share(str(payload.get("code") or ""))
    except FileBoxError as error:
        return _error(error.code, error.message, error.status)

    return jsonify({"share": share})


@api_blueprint.get("/tools/filebox/claim/<code>")
def filebox_claim(code: str):
    try:
        claimed = claim_share(code)
    except FileBoxError as error:
        return _error(error.code, error.message, error.status)

    if claimed.kind == "text":
        return jsonify(
            {
                "share": {
                    "code": claimed.code,
                    "kind": claimed.kind,
                    "name": claimed.name,
                    "size": claimed.size,
                    "remainingDownloads": claimed.remaining_downloads,
                    "text": claimed.text,
                }
            }
        )

    response = send_file(
        claimed.file_path,
        mimetype=claimed.mime_type,
        as_attachment=True,
        download_name=claimed.name,
        conditional=True,
    )
    response.headers["Cache-Control"] = "private, no-store"
    return response

@api_blueprint.post("/auth/login")
def login():
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    email = payload.get("email")
    password = payload.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return _error("validation_error", "邮箱和密码不能为空。", 422)

    if not email.strip() or not password:
        return _error("validation_error", "邮箱和密码不能为空。", 422)

    email_key = email.strip().lower()
    ip = client_ip(request)
    if not _login_limiter().allow(f"login:email:{email_key}") or not _login_limiter().allow(f"login:ip:{ip}"):
        return _error("too_many_attempts", "登录尝试过于频繁，请稍后再试。", 429)

    service = _service()

    try:
        user = service.authenticate(email=email, password=password)
    except InvalidCredentialsError:
        return _error("invalid_credentials", "邮箱或密码不正确，请重试。", 401)

    access_token = service.issue_access_token(user.id)

    return jsonify(
        {
            "accessToken": access_token,
            "tokenType": "Bearer",
            "expiresIn": current_app.config["ACCESS_TOKEN_MAX_AGE"],
            "user": user.to_dict(),
        }
    )


@api_blueprint.post("/auth/register/request-code")
def request_registration_code():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    name = payload.get("name")
    email = payload.get("email")

    if not isinstance(name, str) or not isinstance(email, str):
        return _error("validation_error", "姓名和邮箱不能为空。", 422)

    name = name.strip()
    email = email.strip().lower()

    if len(name) < 2 or len(name) > 40:
        return _error("validation_error", "姓名长度需要在 2 到 40 个字符之间。", 422)

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return _error("validation_error", "请输入有效的邮箱地址。", 422)

    user_repository = UserRepository(get_db())
    if user_repository.find_by_email(email) is not None:
        return _error("email_already_registered", "该邮箱已经注册。", 409)

    ip = client_ip(request)
    if not _email_code_limiter().allow(f"code:email:{email}") or not _email_code_limiter().allow(f"code:ip:{ip}"):
        return _error("too_many_requests", "验证码请求过于频繁，请稍后再试。", 429)

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(seconds=int(current_app.config["REGISTRATION_CODE_MAX_AGE"]))
    ).isoformat()

    RegistrationCodeRepository(get_db()).upsert(
        email=email,
        name=name,
        code_hash=generate_password_hash(code),
        expires_at=expires_at,
    )

    debug_mode = bool(current_app.config["EMAIL_DEBUG"])
    if not debug_mode:
        if not current_app.config["EMAIL_API_TOKEN"]:
            return _error("email_service_unavailable", "邮件服务尚未配置。", 503)

        try:
            send_verification_email(
                api_url=str(current_app.config["EMAIL_API_URL"]),
                token=str(current_app.config["EMAIL_API_TOKEN"]),
                custom_auth=str(current_app.config["EMAIL_CUSTOM_AUTH"]),
                from_name=str(current_app.config["EMAIL_FROM_NAME"]),
                to_name=name,
                to_email=email,
                code=code,
            )
        except EmailDeliveryError:
            return _error("email_delivery_failed", "验证码邮件发送失败，请稍后重试。", 502)

    response = {
        "message": "验证码已发送。",
        "expiresIn": current_app.config["REGISTRATION_CODE_MAX_AGE"],
    }
    if debug_mode:
        response["debugCode"] = code
    return jsonify(response)


@api_blueprint.post("/auth/register/verify")
def verify_registration_code():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    email = payload.get("email")
    code = payload.get("code")
    password = payload.get("password")

    if not all(isinstance(value, str) for value in (email, code, password)):
        return _error("validation_error", "邮箱、验证码和密码不能为空。", 422)

    email = email.strip().lower()
    code = code.strip()

    if len(password) < 8:
        return _error("validation_error", "密码至少需要 8 个字符。", 422)

    repository = RegistrationCodeRepository(get_db())
    row = repository.get(email)

    if row is None:
        return _error("registration_code_not_found", "请先获取邮箱验证码。", 404)

    if int(row["attempts"]) >= 5:
        repository.delete(email)
        return _error("too_many_attempts", "验证码尝试次数过多，请重新获取。", 429)

    expires_at = datetime.fromisoformat(str(row["expires_at"]))
    if expires_at <= datetime.now(timezone.utc):
        repository.delete(email)
        return _error("registration_code_expired", "验证码已过期，请重新获取。", 422)

    if not check_password_hash(str(row["code_hash"]), code):
        repository.increment_attempts(email)
        return _error("invalid_registration_code", "验证码不正确。", 422)

    user_repository = UserRepository(get_db())
    if user_repository.find_by_email(email) is not None:
        repository.delete(email)
        return _error("email_already_registered", "该邮箱已经注册。", 409)

    user_id = f"usr_{secrets.token_hex(8)}"
    user_repository.create(
        user_id=user_id,
        email=email,
        name=str(row["name"]),
        role="个人用户",
        password_hash=generate_password_hash(password),
    )
    repository.delete(email)

    user = _service().get_user_from_token(_service().issue_access_token(user_id))
    access_token = _service().issue_access_token(user_id)

    return jsonify(
        {
            "accessToken": access_token,
            "tokenType": "Bearer",
            "expiresIn": current_app.config["ACCESS_TOKEN_MAX_AGE"],
            "user": user.to_dict(),
        }
    )

@api_blueprint.get("/auth/me")
def profile():
    user, error = _current_user()
    if error:
        return error

    return jsonify({"user": user.to_dict()})


@api_blueprint.put("/me/profile")
def update_profile():
    user, error = _current_user()
    if error:
        return error

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    name = payload.get("name")
    avatar = payload.get("avatar", "")
    if not isinstance(name, str) or not name.strip():
        return _error("validation_error", "名称不能为空。", 422)
    if len(name.strip()) > 40:
        return _error("validation_error", "名称不能超过 40 个字符。", 422)
    if not isinstance(avatar, str):
        return _error("validation_error", "头像格式不正确。", 422)
    if avatar and not AVATAR_PATTERN.fullmatch(avatar):
        return _error("validation_error", "头像必须是 PNG、JPG 或 WebP 图片。", 422)
    if len(avatar) > 1_500_000:
        return _error("avatar_too_large", "头像文件过大，请重新压缩。", 413)

    UserRepository(get_db()).update_profile(user.id, name=name.strip(), avatar=avatar)
    updated = _service().get_user(user.id)
    return jsonify({"user": updated.to_dict()})


@api_blueprint.put("/me/password")
def update_password():
    user, error = _current_user()
    if error:
        return error

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    current_password = payload.get("currentPassword")
    new_password = payload.get("newPassword")
    if not isinstance(current_password, str) or not isinstance(new_password, str):
        return _error("validation_error", "当前密码和新密码不能为空。", 422)
    if len(new_password) < 8 or len(new_password) > 128:
        return _error("validation_error", "新密码长度需要在 8 到 128 个字符之间。", 422)
    if current_password == new_password:
        return _error("validation_error", "新密码不能与当前密码相同。", 422)

    row = UserRepository(get_db()).get(user.id)
    if row is None or not check_password_hash(str(row["password_hash"]), current_password):
        return _error("invalid_current_password", "当前密码不正确。", 422)

    UserRepository(get_db()).update_password(user.id, generate_password_hash(new_password))
    return jsonify({"message": "密码已更新。"})


@api_blueprint.get("/me/favorites")
def list_favorites():
    user, error = _current_user()
    if error:
        return error

    repository = FavoriteRepository(get_db())
    return jsonify({"toolIds": repository.list_tool_ids(user.id)})


@api_blueprint.put("/me/favorites/<tool_id>")
def add_favorite(tool_id: str):
    user, error = _current_user()
    if error:
        return error

    if not _valid_key(tool_id):
        return _error("validation_error", "工具标识格式不正确。", 422)

    FavoriteRepository(get_db()).add(user.id, tool_id)
    return jsonify({"toolId": tool_id, "favorite": True})


@api_blueprint.delete("/me/favorites/<tool_id>")
def remove_favorite(tool_id: str):
    user, error = _current_user()
    if error:
        return error

    if not _valid_key(tool_id):
        return _error("validation_error", "工具标识格式不正确。", 422)

    FavoriteRepository(get_db()).remove(user.id, tool_id)
    return "", 204


@api_blueprint.get("/me/preferences/<key>")
def get_preference(key: str):
    user, error = _current_user()
    if error:
        return error

    if not _valid_key(key):
        return _error("validation_error", "偏好标识格式不正确。", 422)

    value = PreferenceRepository(get_db()).get(user.id, key)
    if value is None:
        return _error("preference_not_found", "没有找到对应的偏好设置。", 404)

    return jsonify({"key": key, "value": value})


@api_blueprint.put("/me/preferences/<key>")
def save_preference(key: str):
    user, error = _current_user()
    if error:
        return error

    if not _valid_key(key):
        return _error("validation_error", "偏好标识格式不正确。", 422)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or "value" not in payload:
        return _error("invalid_request", "请求体必须包含 value 字段。", 400)

    PreferenceRepository(get_db()).set(user.id, key, payload["value"])
    return jsonify({"key": key, "value": payload["value"]})

SHARE_KINDS = {"mermaid", "mindmap", "whiteboard", "flowboard", "codecard", "markdown", "json", "text", "image"}


@api_blueprint.get("/me/usage")
def my_usage():
    user, error = _current_user()
    if error:
        return error
    assert user is not None

    connection = get_db()
    tool_rows = connection.execute(
        """
        SELECT tool_id, COUNT(*) AS count, MAX(created_at) AS last_used_at
        FROM tool_usage_events
        WHERE user_id = ?
        GROUP BY tool_id
        ORDER BY count DESC, last_used_at DESC
        """,
        (user.id,),
    ).fetchall()

    favorite_count = int(
        connection.execute("SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?", (user.id,)).fetchone()["count"]
    )
    preference_count = int(
        connection.execute("SELECT COUNT(*) AS count FROM preferences WHERE user_id = ?", (user.id,)).fetchone()["count"]
    )
    daily_rows = connection.execute(
        """
        SELECT date(created_at) AS day, COUNT(*) AS count
        FROM tool_usage_events
        WHERE user_id = ?
        GROUP BY date(created_at)
        ORDER BY day DESC
        LIMIT 30
        """,
        (user.id,),
    ).fetchall()

    return jsonify(
        {
            "user": user.to_dict(),
            "favoriteCount": favorite_count,
            "preferenceCount": preference_count,
            "totalUsage": sum(int(row["count"]) for row in tool_rows),
            "tools": [
                {
                    "toolId": str(row["tool_id"]),
                    "label": TOOL_LABELS.get(str(row["tool_id"]), str(row["tool_id"])),
                    "count": int(row["count"]),
                    "lastUsedAt": str(row["last_used_at"]),
                }
                for row in tool_rows
            ],
            "daily": [
                {"date": str(row["day"]), "count": int(row["count"])}
                for row in daily_rows
            ],
        }
    )


def _optional_user_id() -> str | None:
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    try:
        return _service().get_user_from_token(token).id
    except InvalidTokenError:
        return None


@api_blueprint.post("/shares")
def create_share():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    kind = payload.get("kind")
    title = payload.get("title")
    content = payload.get("content")

    if not isinstance(kind, str) or kind not in SHARE_KINDS:
        return _error("validation_error", "不支持分享的内容类型。", 422)
    if not isinstance(title, str) or not title.strip():
        title = "未命名分享"
    if len(title.strip()) > 120:
        return _error("validation_error", "标题不能超过 120 个字符。", 422)
    if not isinstance(content, str) or not content:
        return _error("validation_error", "分享内容不能为空。", 422)
    if len(content) > 2_000_000:
        return _error("content_too_large", "分享内容过大。", 413)

    user_id = _optional_user_id()
    code = secrets.token_urlsafe(8)
    expires_at = None
    if user_id is None:
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()

    ShareRepository(get_db()).create(
        code=code,
        kind=kind,
        title=title.strip(),
        content_json=content,
        user_id=user_id,
        expires_at=expires_at,
    )

    return jsonify({"code": code, "expiresAt": expires_at, "owned": user_id is not None})


@api_blueprint.get("/shares/<code>")
def get_share(code: str):
    repository = ShareRepository(get_db())
    row = repository.get(code)
    if row is None:
        return _error("share_not_found", "分享不存在或已删除。", 404)

    expires_at = row["expires_at"]
    if expires_at:
        if datetime.fromisoformat(str(expires_at)) <= datetime.now(timezone.utc):
            return _error("share_expired", "分享已过期。", 410)

    repository.increment_view(code)
    return jsonify(
        {
            "code": str(row["code"]),
            "kind": str(row["kind"]),
            "title": str(row["title"]),
            "content": str(row["content_json"]),
            "createdAt": str(row["created_at"]),
        }
    )


@api_blueprint.get("/me/shares")
def my_shares():
    user, error = _current_user()
    if error:
        return error
    assert user is not None

    rows = ShareRepository(get_db()).list_by_user(user.id)
    return jsonify(
        {
            "shares": [
                {
                    "code": str(row["code"]),
                    "kind": str(row["kind"]),
                    "title": str(row["title"]),
                    "createdAt": str(row["created_at"]),
                    "expiresAt": row["expires_at"],
                    "viewCount": int(row["view_count"]),
                }
                for row in rows
            ]
        }
    )


@api_blueprint.delete("/me/shares/<code>")
def delete_share(code: str):
    user, error = _current_user()
    if error:
        return error
    assert user is not None

    if not ShareRepository(get_db()).delete(code, user.id):
        return _error("share_not_found", "没有找到这个分享。", 404)
    return "", 204


@api_blueprint.post("/auth/password/reset-request")
def request_password_reset():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    email = payload.get("email")
    if not isinstance(email, str) or not email.strip():
        return _error("validation_error", "请输入邮箱地址。", 422)
    email = email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return _error("validation_error", "请输入有效的邮箱地址。", 422)

    ip = client_ip(request)
    if not _email_code_limiter().allow(f"reset:email:{email}") or not _email_code_limiter().allow(f"reset:ip:{ip}"):
        return _error("too_many_requests", "请求过于频繁，请稍后再试。", 429)

    user_repository = UserRepository(get_db())
    user_row = user_repository.find_by_email(email)
    expires_in = current_app.config["REGISTRATION_CODE_MAX_AGE"]
    if user_row is None:
        return jsonify({"message": "如果该邮箱已注册，验证码将发送到邮箱。", "expiresIn": expires_in})

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
    ).isoformat()

    PasswordResetCodeRepository(get_db()).upsert(
        email=email,
        name=str(user_row["name"]),
        code_hash=generate_password_hash(code),
        expires_at=expires_at,
    )

    debug_mode = bool(current_app.config["EMAIL_DEBUG"])
    if not debug_mode:
        if not current_app.config["EMAIL_API_TOKEN"]:
            return _error("email_service_unavailable", "邮件服务尚未配置。", 503)
        try:
            send_password_reset_email(
                api_url=str(current_app.config["EMAIL_API_URL"]),
                token=str(current_app.config["EMAIL_API_TOKEN"]),
                custom_auth=str(current_app.config["EMAIL_CUSTOM_AUTH"]),
                from_name=str(current_app.config["EMAIL_FROM_NAME"]),
                to_name=str(user_row["name"]),
                to_email=email,
                code=code,
            )
        except EmailDeliveryError:
            return _error("email_delivery_failed", "验证码邮件发送失败，请稍后重试。", 502)

    response = {
        "message": "如果该邮箱已注册，验证码将发送到邮箱。",
        "expiresIn": expires_in,
    }
    if debug_mode:
        response["debugCode"] = code
    return jsonify(response)


@api_blueprint.post("/auth/password/reset-verify")
def verify_password_reset():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_request", "请求体必须是 JSON 对象。", 400)

    email = payload.get("email")
    code = payload.get("code")
    new_password = payload.get("newPassword")
    if not all(isinstance(value, str) for value in (email, code, new_password)):
        return _error("validation_error", "邮箱、验证码和新密码不能为空。", 422)

    email = email.strip().lower()
    code = code.strip()
    if len(new_password) < 8 or len(new_password) > 128:
        return _error("validation_error", "新密码长度需要在 8 到 128 个字符之间。", 422)

    repository = PasswordResetCodeRepository(get_db())
    row = repository.get(email)
    if row is None:
        return _error("password_reset_code_not_found", "请先获取邮箱验证码。", 404)

    if int(row["attempts"]) >= 5:
        repository.delete(email)
        return _error("too_many_attempts", "验证码尝试次数过多，请重新获取。", 429)

    if datetime.fromisoformat(str(row["expires_at"])) <= datetime.now(timezone.utc):
        repository.delete(email)
        return _error("password_reset_code_expired", "验证码已过期，请重新获取。", 422)

    if not check_password_hash(str(row["code_hash"]), code):
        repository.increment_attempts(email)
        return _error("invalid_password_reset_code", "验证码不正确。", 422)

    user_repository = UserRepository(get_db())
    user_row = user_repository.find_by_email(email)
    if user_row is None:
        repository.delete(email)
        return _error("user_not_found", "没有找到该邮箱对应的账户。", 404)

    user_repository.update_password(str(user_row["id"]), generate_password_hash(new_password))
    repository.delete(email)
    return jsonify({"message": "密码已重置，请使用新密码登录。"})
