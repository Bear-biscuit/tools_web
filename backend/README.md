# Bocchi Tools API

Flask + SQLite 后端，提供登录、邮箱注册、收藏、偏好、Emoji Kitchen、文件快递柜、王者战力查询、分享链接、个人统计和管理后台接口。

## 安装与启动

开发模式（Flask 内置服务器）：

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python run.py          # 默认 http://127.0.0.1:8000
```

生产模式（Waitress）：

```bash
.venv/bin/python serve.py        # 默认 http://127.0.0.1:9182，可通过 NOVA_HOST/NOVA_PORT 配置
```

SQLite 默认保存在 `data/nova.db`，表结构在启动时自动创建/迁移。

## 环境变量

全部配置见 `.env.example`，复制为 `.env` 后按需修改。关键项：

| 变量 | 说明 |
|------|------|
| `NOVA_SECRET_KEY` | 会话/Token 签名密钥（生产必须改成随机值） |
| `NOVA_HOST` / `NOVA_PORT` | 监听地址与端口 |
| `NOVA_DEBUG` | `true` 时注册/重置验证码通过 `debugCode` 直接返回 |
| `NOVA_CORS_ORIGINS` | 允许的跨域来源，逗号分隔 |
| `NOVA_EMAIL_*` | 邮件发送服务配置（注册/重置验证码） |
| `NOVA_ADMIN_USERNAME` / `NOVA_ADMIN_PASSWORD` | 管理员初始账号（首次登录强制改密） |

## 接口

### 基础

- `GET /api/health`
- `GET /api/tools/status`
- `POST /api/tools/usage`

### 认证与账户

- `POST /api/auth/login`
- `POST /api/auth/register/request-code`
- `POST /api/auth/register/verify`
- `POST /api/auth/password/reset-request`
- `POST /api/auth/password/reset-verify`
- `GET /api/auth/me`
- `PUT /api/me/profile`
- `PUT /api/me/password`

### 收藏与偏好

- `GET /api/me/favorites`
- `PUT /api/me/favorites/<tool_id>`
- `DELETE /api/me/favorites/<tool_id>`
- `GET /api/me/preferences/<key>`
- `PUT /api/me/preferences/<key>`

### 个人统计

- `GET /api/me/usage`

### 分享链接

- `POST /api/shares`
- `GET /api/shares/<code>`
- `GET /api/me/shares`
- `DELETE /api/me/shares/<code>`

### 工具

- Emoji：`GET /api/tools/emoji/list`、`/combine`、`/random`、`/image`
- 王者战力：`GET /api/tools/hok-power/heroes`、`/query`
- 文件快递柜：`GET /api/tools/filebox/status`、`POST /api/tools/filebox/text`、`POST /api/tools/filebox/file`、`POST /api/tools/filebox/inspect`、`GET /api/tools/filebox/claim/<code>`

### 管理后台（`/api/admin/*`）

默认账号 `admin` / `admin`，首次登录会强制修改密码，修改后才能调用除改密外的其它管理接口。

- `POST /login`、`GET /session`、`PUT /password`、`PUT /profile`
- `GET /dashboard`、`GET /users`、`DELETE /users/<user_id>`
- `GET /tools`、`PUT /tools/<tool_id>`
- `GET /usage`、`DELETE /usage`
- `GET /filebox`、`DELETE /filebox/<code>`

## 测试

```bash
.venv/bin/python -m unittest discover -s tests -v
```