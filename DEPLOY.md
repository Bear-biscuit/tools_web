# 部署文档

本文档描述如何将 Bocchi 工具台部署到一台 Ubuntu/Debian 服务器。

目标结构：

```
/var/www/bocchi/
├── backend/          # Flask 后端（含 .venv）
├── frontend/dist/    # 前端构建产物
└── ...
```

## 1. 环境准备

```bash
sudo apt update && sudo apt upgrade -y

# Python 3.10+（代码兼容 3.8+）
sudo apt install -y python3 python3-venv python3-pip

# Nginx 与证书
sudo apt install -y nginx certbot python3-certbot-nginx

# Node.js 22（仅当需要在服务器上构建前端时；本地构建可跳过）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. 上传代码

```bash
sudo mkdir -p /var/www/bocchi
sudo chown -R $USER:$USER /var/www/bocchi

# 方式 A：本地上传（排除本地依赖与数据库）
rsync -av \
  --exclude 'backend/.venv' \
  --exclude 'backend/data/*.db*' \
  --exclude 'backend/data/filebox' \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  /path/to/project/ root@服务器IP:/var/www/bocchi/

# 方式 B：Git 克隆
git clone <仓库地址> /var/www/bocchi
```

## 3. 后端部署

```bash
cd /var/www/bocchi/backend

python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

cp .env.example .env
nano .env
```

`.env` 必改项：

```env
NOVA_SECRET_KEY=<随机长字符串>          # python3 -c "import secrets; print(secrets.token_hex(32))"
NOVA_HOST=127.0.0.1
NOVA_PORT=9182
NOVA_DEBUG=false
NOVA_CORS_ORIGINS=https://your-domain.com

NOVA_EMAIL_API_URL=https://your-mail-api.example.com/api/send_mail
NOVA_EMAIL_API_TOKEN=<邮件服务地址JWT>
NOVA_EMAIL_CUSTOM_AUTH=                # 站点未启用私有密码时留空
NOVA_EMAIL_DEBUG=false

NOVA_ADMIN_USERNAME=admin
NOVA_ADMIN_PASSWORD=admin              # 首次登录会强制修改
```

> ⚠️ 确认 `NOVA_HOST` 是 `127.0.0.1`（回环地址），不要写成其它不存在的地址。

### 邮件服务（注册 / 重置密码验证码）

后端不内置 SMTP，而是调用一个兼容的邮件 API 发送验证码，请求体格式为：

```json
{
  "from_name": "Bocchi",
  "to_name": "收件人",
  "to_mail": "user@example.com",
  "subject": "验证码",
  "is_html": true,
  "content": "<html>...</html>"
}
```

推荐使用开源项目 **cloudflare_temp_email** 自建免费的临时域名邮箱服务：

- 仓库：<https://github.com/dreamhunter2333/cloudflare_temp_email>
- 部署后可得到一个「临时邮箱」站点；在该站点前端**创建并登录一个邮箱**，即可在界面中复制该邮箱的「地址 JWT」。
- 把该 JWT 填入 `NOVA_EMAIL_API_TOKEN`；若你的邮箱站点启用了私有密码，再把站点密码填入 `NOVA_EMAIL_CUSTOM_AUTH`。
- `NOVA_EMAIL_API_URL` 填写你部署好的发送接口，例如 `https://你的邮箱站点域名/api/send_mail`（本项目的 `email_service.py` 请求体与该接口完全一致）。
- 若暂时没有邮件服务，可保持 `NOVA_EMAIL_DEBUG=true`：验证码会直接打印到后端日志，便于本地测试注册 / 重置密码流程。

> 没有配置真实邮件服务前，请勿在公网开启注册，避免验证码泄露到日志。

数据目录授权：

```bash
sudo chown -R www-data:www-data /var/www/bocchi/backend/data
```

### 生产启动（Waitress + systemd）

项目自带 `serve.py`（Waitress 入口）和 `deploy/nova-backend.service`。

```bash
sudo cp /var/www/bocchi/deploy/nova-backend.service /etc/systemd/system/nova-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now nova-backend
```

验证：

```bash
sudo systemctl status nova-backend --no-pager   # Active: active (running)
curl http://127.0.0.1:9182/api/health           # {"service":"nova-tools-api","status":"ok"}
```

> 也可临时前台运行：`cd /var/www/bocchi/backend && .venv/bin/python serve.py`

## 4. 前端部署

推荐**本地构建后上传 dist**（license key 在本地 `frontend/.env`）：

```bash
cd frontend
npm install
npm run build

rsync -av --delete frontend/dist/ root@服务器IP:/var/www/bocchi/frontend/dist/
```

若在服务器上构建，先创建 `frontend/.env` 填入：

```env
VITE_TLDRAW_LICENSE_KEY=<你的 tldraw license key>
```

再执行 `npm install && npm run build`。**没有该 key 时，生产环境流程图页面会白屏。**

### tldraw License Key 说明

「在线流程图」工具基于 [tldraw](https://tldraw.dev) SDK。tldraw 在生产环境**必须提供 license key**，否则编辑画布在 5 秒后停止渲染（表现就是白屏）。license 类型还决定是否移除画布上的 "made with tldraw" 水印。

**怎么申请**（官网 <https://tldraw.dev> 的 License 页面）：

| 类型 | 水印 | 时长 | 适用场景 |
|------|------|------|----------|
| Trial（试用） | 无 | 100 天 | 上线前评估，填试用表单后邮件即时下发，每个公司/项目限一次 |
| Commercial（商业） | 无 | 按年 | 商业生产环境必需，通过 plans 表单联系销售 |
| Hobby（爱好） | 有 | 视申请 | 非商业项目，需提交申请审核 |

**注意事项**：

- key 绑定域名：申请时填写你的站点域名。`example.com` 同时匹配 `www.example.com`；`*.example.com` 匹配所有子域名；部署到未授权域名会被视为未授权。
- key 可公开：它在浏览器端本地校验、不联网 license 服务器，可以安全地写进前端构建产物，无需保密。
- 开发环境（`localhost` / 非 HTTPS）不需要 key；只有「生产构建 + HTTPS + 真实域名」才需要。
- 试用 key 到期无宽限期会立即失效；年度/永久 key 到期后有 30 天宽限期。到期后画布同样会停止渲染。

## 5. Nginx

使用项目自带的 `deploy/nginx.conf`：

```bash
sudo cp /var/www/bocchi/deploy/nginx.conf /etc/nginx/sites-available/bocchi
sudo ln -sf /etc/nginx/sites-available/bocchi /etc/nginx/sites-enabled/bocchi

# 签发 SSL 证书
sudo certbot --nginx -d your-domain.com

sudo nginx -t
sudo systemctl reload nginx
```

若使用自购证书，把 `nginx.conf` 里 `ssl_certificate` 两行路径替换为你的证书路径。

## 6. 最终验证

```bash
curl https://your-domain.com/api/health
```

浏览器打开 `https://your-domain.com/`，确认登录、注册、忘记密码、流程图（tldraw）等正常。

管理后台入口 `https://your-domain.com/admin`（页面不显示入口，需手动访问），默认账号 `admin` / `admin`，首次登录会强制修改密码；修改后才可进入后台的用户管理、工具启停、使用统计、文件柜清理、管理员资料等功能。生产环境务必在首次登录后立即改掉默认密码。


## 常见问题

| 现象 | 原因 | 解决 |
|------|------|------|
| `Address already in use` | 端口被占用 | `ss -lntp \| grep 9182` 查占用进程 |
| `No module named 'waitress'` | 依赖未装 | `.venv/bin/pip install -r requirements.txt` |
| `Permission denied: data/nova.db` | data 目录无写权限 | `sudo chown -R www-data:www-data /var/www/bocchi/backend/data` |
| 流程图页面白屏 | 前端构建时缺 tldraw license key | 在 `frontend/.env` 配置 key 后重新构建 |