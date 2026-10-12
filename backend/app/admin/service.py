from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash

from ..repositories import AdminRepository


class InvalidAdminCredentialsError(Exception):
    pass


class InvalidAdminTokenError(Exception):
    pass


@dataclass(frozen=True)
class Admin:
    username: str
    must_change_password: bool
    display_name: str = ""
    avatar: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "username": self.username,
            "displayName": self.display_name or self.username,
            "avatar": self.avatar,
            "mustChangePassword": self.must_change_password,
        }


class AdminService:
    def __init__(self, *, repository: AdminRepository, secret_key: str, token_salt: str, token_max_age: int) -> None:
        self._admins = repository
        self._serializer = URLSafeTimedSerializer(secret_key, salt=token_salt)
        self._token_max_age = token_max_age

    def authenticate(self, username: str, password: str) -> Admin:
        row = self._admins.get(username)
        password_hash = str(row["password_hash"]) if row else ""
        if row is None or not password_hash or not check_password_hash(password_hash, password):
            raise InvalidAdminCredentialsError()
        return self._to_admin(row)

    def issue_token(self, username: str) -> str:
        return self._serializer.dumps({"sub": username, "scope": "admin"})

    def get_admin_from_token(self, token: str) -> Admin:
        try:
            payload = self._serializer.loads(token, max_age=self._token_max_age)
        except (BadSignature, SignatureExpired) as error:
            raise InvalidAdminTokenError() from error
        username = payload.get("sub")
        if payload.get("scope") != "admin" or not isinstance(username, str):
            raise InvalidAdminTokenError()
        row = self._admins.get(username)
        if row is None:
            raise InvalidAdminTokenError()
        return self._to_admin(row)

    def get_admin(self, username: str) -> Admin:
        row = self._admins.get(username)
        if row is None:
            raise InvalidAdminTokenError()
        return self._to_admin(row)

    @staticmethod
    def _to_admin(row: Any) -> Admin:
        return Admin(
            username=str(row["username"]),
            must_change_password=bool(row["must_change_password"]),
            display_name=str(row["display_name"] or ""),
            avatar=str(row["avatar"] or ""),
        )
