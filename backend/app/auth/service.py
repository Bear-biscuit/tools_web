from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from ..repositories import UserRepository


class InvalidCredentialsError(Exception):
    """Raised when an email and password pair is invalid."""


class InvalidTokenError(Exception):
    """Raised when an access token is missing, invalid, or expired."""


@dataclass(frozen=True)
class User:
    id: str
    email: str
    name: str
    role: str
    avatar: str = ""

    def to_dict(self) -> Dict[str, str]:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "avatar": self.avatar,
        }


DUMMY_PASSWORD_HASH = generate_password_hash("nova-invalid-password")


class AuthService:
    def __init__(
        self,
        *,
        user_repository: UserRepository,
        secret_key: str,
        token_salt: str,
        token_max_age: int,
    ) -> None:
        self._users = user_repository
        self._serializer = URLSafeTimedSerializer(secret_key, salt=token_salt)
        self._token_max_age = token_max_age

    def authenticate(self, *, email: str, password: str) -> User:
        row = self._users.find_by_email(email)
        password_hash = str(row["password_hash"]) if row else DUMMY_PASSWORD_HASH
        password_matches = check_password_hash(password_hash, password)

        if row is None or not password_matches:
            raise InvalidCredentialsError()

        return self._to_user(row)

    def issue_access_token(self, user_id: str) -> str:
        return self._serializer.dumps({"sub": user_id})

    def get_user(self, user_id: str) -> User:
        row = self._users.get(user_id)
        if row is None:
            raise InvalidTokenError()
        return self._to_user(row)

    def get_user_from_token(self, token: str) -> User:
        try:
            payload: Dict[str, Any] = self._serializer.loads(
                token,
                max_age=self._token_max_age,
            )
        except (BadSignature, SignatureExpired) as error:
            raise InvalidTokenError() from error

        user_id = payload.get("sub")
        if not isinstance(user_id, str):
            raise InvalidTokenError()

        row = self._users.get(user_id)
        if row is None:
            raise InvalidTokenError()

        return self._to_user(row)

    @staticmethod
    def _to_user(row: Any) -> User:
        return User(
            id=str(row["id"]),
            email=str(row["email"]),
            name=str(row["name"]),
            role=str(row["role"]),
            avatar=str(row["avatar"] or ""),
        )