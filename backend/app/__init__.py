from __future__ import annotations

from flask import Flask, jsonify

from . import db
from .admin import admin_blueprint
from .api.routes import api_blueprint
from .config import Config
from .rate_limit import RateLimiter


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    app.extensions["login_limiter"] = RateLimiter(max_events=10, window_seconds=60)
    app.extensions["email_code_limiter"] = RateLimiter(max_events=5, window_seconds=60)

    db.init_app(app)

    from flask_cors import CORS

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=False,
    )

    app.register_blueprint(api_blueprint, url_prefix="/api")
    app.register_blueprint(admin_blueprint, url_prefix="/api/admin")

    @app.get("/")
    def index():
        return jsonify(
            {
                "name": "Bocchi Tools API",
                "status": "ok",
                "endpoints": {
                    "health": "/api/health",
                    "login": "/api/auth/login",
                    "profile": "/api/auth/me",
                    "favorites": "/api/me/favorites",
                    "preferences": "/api/me/preferences/<key>",
                    "filebox": "/api/tools/filebox/status",
                },
            }
        )

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": {"code": "not_found", "message": "请求的接口不存在。"}}), 404

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return (
            jsonify({"error": {"code": "method_not_allowed", "message": "该接口不支持当前请求方法。"}}),
            405,
        )

    @app.errorhandler(413)
    def payload_too_large(_error):
        return (
            jsonify(
                {
                    "error": {
                        "code": "payload_too_large",
                        "message": "上传内容超过服务器限制。",
                    }
                }
            ),
            413,
        )
    return app

