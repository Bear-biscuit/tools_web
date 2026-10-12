from __future__ import annotations

import io
import os
import tempfile
import unittest
from unittest.mock import patch

from app import create_app
from app.db import get_db


class AuthApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        database_path = os.path.join(self.temp_dir.name, "test.db")
        self.app = create_app(
            {
                "TESTING": True,
                "SECRET_KEY": "test-secret",
                "DATABASE": database_path,
                "IMPORT_EMOJI_DATA": False,
                "FILEBOX_DIR": os.path.join(self.temp_dir.name, "filebox"),
                "FILEBOX_MAX_UPLOAD_BYTES": 1024 * 1024,
                "FILEBOX_MAX_TEXT_BYTES": 64 * 1024,
                "DEMO_USER_ID": "usr_demo",
                "DEMO_EMAIL": "demo@example.com",
                "DEMO_PASSWORD": "demo123",
                "DEMO_USER_NAME": "演示用户",
                "DEMO_USER_ROLE": "访客",
                "ACCESS_TOKEN_MAX_AGE": 3600,
                "EMAIL_DEBUG": True,
                "EMAIL_API_TOKEN": "",
                "ADMIN_USERNAME": "admin",
                "ADMIN_PASSWORD": "admin",
                "ADMIN_TOKEN_SALT": "test-admin-token",
                "ADMIN_ACCESS_TOKEN_MAX_AGE": 3600,
            }
        )
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def login(self) -> str:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "demo@example.com", "password": "demo123"},
        )
        self.assertEqual(response.status_code, 200)
        return response.get_json()["accessToken"]

    def auth_headers(self) -> dict:
        return {"Authorization": "Bearer " + self.login()}

    def test_health(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "ok")

    def test_login_success(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "DEMO@EXAMPLE.COM", "password": "demo123"},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(payload["accessToken"])
        self.assertEqual(payload["tokenType"], "Bearer")
        self.assertEqual(payload["user"]["email"], "demo@example.com")

    def test_login_rejects_invalid_credentials(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "demo@example.com", "password": "wrongpass"},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 401)
        self.assertEqual(payload["error"]["code"], "invalid_credentials")

    def test_login_requires_email_and_password(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "", "password": ""},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 422)
        self.assertEqual(payload["error"]["code"], "validation_error")

    def test_profile_requires_valid_token(self) -> None:
        response = self.client.get("/api/auth/me", headers=self.auth_headers())
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["user"]["name"], "演示用户")

    def test_favorites_crud(self) -> None:
        headers = self.auth_headers()

        add_response = self.client.put("/api/me/favorites/json", headers=headers)
        self.assertEqual(add_response.status_code, 200)

        list_response = self.client.get("/api/me/favorites", headers=headers)
        self.assertEqual(list_response.get_json()["toolIds"], ["json"])

        delete_response = self.client.delete("/api/me/favorites/json", headers=headers)
        self.assertEqual(delete_response.status_code, 204)

        empty_response = self.client.get("/api/me/favorites", headers=headers)
        self.assertEqual(empty_response.get_json()["toolIds"], [])

    def test_preferences_round_trip(self) -> None:
        headers = self.auth_headers()
        value = {"color": "#2e5bff", "palette": ["#ffffff", "#2e5bff"]}

        save_response = self.client.put(
            "/api/me/preferences/color.latest",
            headers=headers,
            json={"value": value},
        )
        self.assertEqual(save_response.status_code, 200)

        get_response = self.client.get(
            "/api/me/preferences/color.latest",
            headers=headers,
        )
        self.assertEqual(get_response.get_json()["value"], value)

    def test_emoji_list(self) -> None:
        response = self.client.get("/api/tools/emoji/list")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(payload["emojis"]), 500)
        self.assertEqual(payload["emojis"][0]["glyph"], "🪄")

    def test_emoji_combine_and_random(self) -> None:
        with self.app.app_context():
            connection = get_db()
            connection.execute(
                """
                INSERT INTO emoji_combinations
                    (left_emoji, right_emoji, data_version, resource_id)
                VALUES (?, ?, ?, ?)
                """,
                ("u1f600", "u1f602", "20201001", "u1f600/u1f600_u1f602"),
            )
            connection.commit()

        combine = self.client.get(
            "/api/tools/emoji/combine?left=u1f600&right=u1f602"
        )
        self.assertEqual(combine.status_code, 200)
        self.assertEqual(combine.get_json()["left"], "u1f600")
        self.assertIn("/api/tools/emoji/image", combine.get_json()["imageUrl"])

        random_response = self.client.get("/api/tools/emoji/random")
        self.assertEqual(random_response.status_code, 200)
        self.assertTrue(random_response.get_json()["resourceId"])

    def test_email_registration_flow(self) -> None:
        request_response = self.client.post(
            "/api/auth/register/request-code",
            json={"name": "测试用户", "email": "new@example.com"},
        )
        request_payload = request_response.get_json()

        self.assertEqual(request_response.status_code, 200)
        self.assertEqual(len(request_payload["debugCode"]), 6)

        verify_response = self.client.post(
            "/api/auth/register/verify",
            json={
                "email": "new@example.com",
                "code": request_payload["debugCode"],
                "password": "securepass123",
            },
        )
        verify_payload = verify_response.get_json()

        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(verify_payload["user"]["email"], "new@example.com")
        self.assertEqual(verify_payload["user"]["name"], "测试用户")

        login_response = self.client.post(
            "/api/auth/login",
            json={"email": "new@example.com", "password": "securepass123"},
        )
        self.assertEqual(login_response.status_code, 200)

    def test_registration_uses_email_service_without_debug_code(self) -> None:
        self.app.config["EMAIL_DEBUG"] = False
        self.app.config["EMAIL_API_TOKEN"] = "test-token"

        with patch("app.api.routes.send_verification_email") as send_mail:
            response = self.client.post(
                "/api/auth/register/request-code",
                json={"name": "邮件用户", "email": "mail@example.com"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("debugCode", response.get_json())
        send_mail.assert_called_once()
        self.assertEqual(send_mail.call_args.kwargs["to_email"], "mail@example.com")

    def test_email_registration_rejects_bad_code(self) -> None:
        request_response = self.client.post(
            "/api/auth/register/request-code",
            json={"name": "测试用户", "email": "bad-code@example.com"},
        )
        self.assertEqual(request_response.status_code, 200)

        verify_response = self.client.post(
            "/api/auth/register/verify",
            json={
                "email": "bad-code@example.com",
                "code": "000000",
                "password": "securepass123",
            },
        )
        self.assertEqual(verify_response.status_code, 422)
        self.assertEqual(
            verify_response.get_json()["error"]["code"],
            "invalid_registration_code",
        )

    def test_private_endpoints_require_token(self) -> None:
        response = self.client.get("/api/me/favorites")
        self.assertEqual(response.status_code, 401)


    def test_filebox_text_round_trip(self) -> None:
        create_response = self.client.post(
            "/api/tools/filebox/text",
            json={
                "text": "Nova 文件快递柜测试",
                "expireValue": 1,
                "expireStyle": "count",
            },
        )
        payload = create_response.get_json()
        self.assertEqual(create_response.status_code, 201)
        code = payload["share"]["code"]
        self.assertEqual(payload["share"]["kind"], "text")

        inspect_response = self.client.post(
            "/api/tools/filebox/inspect",
            json={"code": code},
        )
        self.assertEqual(inspect_response.status_code, 200)
        self.assertEqual(inspect_response.get_json()["share"]["name"], "寄送内容.txt")

        claim_response = self.client.get(f"/api/tools/filebox/claim/{code}")
        self.assertEqual(claim_response.status_code, 200)
        self.assertEqual(claim_response.get_json()["share"]["text"], "Nova 文件快递柜测试")

        expired_response = self.client.get(f"/api/tools/filebox/claim/{code}")
        self.assertEqual(expired_response.status_code, 404)

    def test_filebox_file_round_trip(self) -> None:
        create_response = self.client.post(
            "/api/tools/filebox/file",
            data={
                "file": (io.BytesIO("文件内容".encode("utf-8")), "note.txt"),
                "expireValue": "1",
                "expireStyle": "day",
            },
            content_type="multipart/form-data",
        )
        payload = create_response.get_json()
        self.assertEqual(create_response.status_code, 201)
        code = payload["share"]["code"]
        self.assertEqual(payload["share"]["kind"], "file")

        claim_response = self.client.get(f"/api/tools/filebox/claim/{code}")
        self.assertEqual(claim_response.status_code, 200)
        self.assertEqual(claim_response.data.decode("utf-8"), "文件内容")
        self.assertIn("note.txt", claim_response.headers["Content-Disposition"])
        claim_response.close()

    def test_filebox_rejects_invalid_expiry(self) -> None:
        response = self.client.post(
            "/api/tools/filebox/text",
            json={"text": "test", "expireValue": 0, "expireStyle": "day"},
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.get_json()["error"]["code"], "invalid_expire_value")

    def test_update_profile(self) -> None:
        avatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        response = self.client.put(
            "/api/me/profile",
            headers=self.auth_headers(),
            json={"name": "Bocchi", "avatar": avatar},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["name"], "Bocchi")
        self.assertEqual(response.get_json()["user"]["avatar"], avatar)

        profile = self.client.get("/api/auth/me", headers=self.auth_headers())
        self.assertEqual(profile.get_json()["user"]["name"], "Bocchi")

    def test_update_password(self) -> None:
        headers = self.auth_headers()
        response = self.client.put(
            "/api/me/password",
            headers=headers,
            json={"currentPassword": "demo123", "newPassword": "new-secure-password"},
        )
        self.assertEqual(response.status_code, 200)

        old_login = self.client.post(
            "/api/auth/login",
            json={"email": "demo@example.com", "password": "demo123"},
        )
        self.assertEqual(old_login.status_code, 401)

        new_login = self.client.post(
            "/api/auth/login",
            json={"email": "demo@example.com", "password": "new-secure-password"},
        )
        self.assertEqual(new_login.status_code, 200)

    def test_password_update_rejects_wrong_current_password(self) -> None:
        response = self.client.put(
            "/api/me/password",
            headers=self.auth_headers(),
            json={"currentPassword": "wrong-password", "newPassword": "new-secure-password"},
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.get_json()["error"]["code"], "invalid_current_password")


    def test_admin_requires_password_change_before_operations(self) -> None:
        login = self.client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "admin"},
        )
        self.assertEqual(login.status_code, 200)
        payload = login.get_json()
        self.assertTrue(payload["admin"]["mustChangePassword"])
        token = payload["accessToken"]

        blocked = self.client.get(
            "/api/admin/dashboard",
            headers={"Authorization": "Bearer " + token},
        )
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.get_json()["error"]["code"], "password_change_required")

        changed = self.client.put(
            "/api/admin/password",
            headers={"Authorization": "Bearer " + token},
            json={"currentPassword": "admin", "newPassword": "admin-secure-password"},
        )
        self.assertEqual(changed.status_code, 200)

        dashboard = self.client.get(
            "/api/admin/dashboard",
            headers={"Authorization": "Bearer " + token},
        )
        self.assertEqual(dashboard.status_code, 200)
        self.assertIn("users", dashboard.get_json()["counts"])

    def test_admin_session_and_lists(self) -> None:
        login = self.client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "admin"},
        )
        token = login.get_json()["accessToken"]
        self.client.put(
            "/api/admin/password",
            headers={"Authorization": "Bearer " + token},
            json={"currentPassword": "admin", "newPassword": "admin-secure-password"},
        )

        users = self.client.get(
            "/api/admin/users",
            headers={"Authorization": "Bearer " + token},
        )
        self.assertEqual(users.status_code, 200)
        self.assertTrue(users.get_json()["users"])

        session = self.client.get(
            "/api/admin/session",
            headers={"Authorization": "Bearer " + token},
        )
        self.assertEqual(session.status_code, 200)
        self.assertFalse(session.get_json()["admin"]["mustChangePassword"])


    def test_admin_can_pause_tools_and_read_usage(self) -> None:
        login = self.client.post("/api/admin/login", json={"username": "admin", "password": "admin"})
        token = login.get_json()["accessToken"]
        headers = {"Authorization": "Bearer " + token}
        self.client.put(
            "/api/admin/password",
            headers=headers,
            json={"currentPassword": "admin", "newPassword": "admin-secure-password"},
        )

        disabled = self.client.put(
            "/api/admin/tools/json",
            headers=headers,
            json={"enabled": False},
        )
        self.assertEqual(disabled.status_code, 200)

        status = self.client.get("/api/tools/status")
        json_status = next(item for item in status.get_json()["tools"] if item["id"] == "json")
        self.assertFalse(json_status["enabled"])
        paused_usage = self.client.post("/api/tools/usage", json={"toolId": "json"})
        self.assertEqual(paused_usage.status_code, 423)

        self.client.put(
            "/api/admin/tools/json",
            headers=headers,
            json={"enabled": True},
        )
        usage = self.client.post("/api/tools/usage", json={"toolId": "json"})
        self.assertEqual(usage.status_code, 204)

        report = self.client.get("/api/admin/usage?days=30", headers=headers)
        self.assertEqual(report.status_code, 200)
        json_usage = next(item for item in report.get_json()["tools"] if item["id"] == "json")
        self.assertGreaterEqual(json_usage["total"], 1)

        cleared = self.client.delete("/api/admin/usage", headers=headers)
        self.assertEqual(cleared.status_code, 204)
        empty_report = self.client.get("/api/admin/usage?days=30", headers=headers)
        self.assertEqual(empty_report.get_json()["total"], 0)


if __name__ == "__main__":
    unittest.main()



