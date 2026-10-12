# Bocchi 工具台

个人网页工具箱：37 个常用在线工具，前后端分离。**无需登录即可使用**；登录用于跨设备同步收藏、偏好、操作记录和数据存储。

线上地址：<https://tools.bocchi.vip>

## 功能特性

- **37 个在线工具**：JSON 格式化、时间戳转换、Base64/URL 编解码、密码生成、Markdown 编辑器、文本对比、JWT 解析、哈希、正则测试、二维码、颜色工具、表情包合成、文件快递柜、文本转图表（Mermaid）、思维导图、手绘白板、在线流程图（tldraw）、CyberChef 编解码等
- **账户体系**：邮箱验证码注册 / 登录 / 忘记密码（注册和重置密码均内嵌在登录页）
- **数据同步**：收藏工具、偏好设置、工具操作记录，游客本地存储，登录后云同步
- **工具分享**：流程图 / 思维导图 / 白板 / 代码卡片等生成物可生成只读分享链接
- **文件快递柜**：取件码分享文本与文件，支持有效期、次数限制、到期清理
- **管理后台**：用户管理、工具启停、全局使用统计、管理员账号管理（首登强制改密码）
- **个人数据页**：查看自己的工具使用排行与明细
- **响应式设计**：适配桌面与移动端
- **SEO 优化**：每个工具独立静态 HTML、sitemap、robots、Open Graph、JSON-LD 结构化数据
- **PWA 支持**：可安装、离线打开；计时器支持系统通知

## 技术栈

- **前端**：React 19、TypeScript、Vite
- **后端**：Python、Flask、SQLite、Waitress
- **主要库**：Excalidraw（白板）、tldraw（流程图）、Mermaid、Markmap、recharts、hls.js、jsQR 等

## 目录结构

```
.
├── frontend/            # React 前端
│   ├── src/
│   │   ├── components/  # 页面与通用组件（登录、账户、后台、分享落地页等）
│   │   ├── tools/       # 各工具实现
│   │   ├── services/    # API 客户端
│   │   ├── seo/         # SEO 元数据与路由
│   │   └── ...
│   ├── public/          # PWA 图标、manifest、notification-worker
│   └── vite.config.ts   # 构建 + SEO 静态页生成插件
├── backend/             # Flask 后端
│   ├── app/             # 应用代码（api/admin/auth 蓝图、db、repositories）
│   ├── data/            # SQLite 数据库与运行时文件（.db 不入库）
│   ├── tests/           # 后端测试
│   ├── serve.py         # 生产入口（Waitress）
│   └── run.py           # 开发入口（Flask 开发服务器）
├── deploy/              # 部署配置
│   ├── nova-backend.service   # systemd 服务
│   └── nginx.conf             # Nginx 站点配置
└── DEPLOY.md            # 部署文档
```

## 本地开发

### 后端

```bash
cd backend
python -m venv .venv
# Windows
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cp .env.example .env   # 按需修改，EMAIL_DEBUG=true 可在调试时直接回填验证码
.\.venv\Scripts\python.exe run.py
# Linux/macOS
.venv/bin/pip install -r requirements.txt
.venv/bin/python run.py
```

后端默认运行在 `http://127.0.0.1:8000`，数据库默认 `backend/data/nova.db`。

### 前端

```bash
cd frontend
npm install
# 如需要流程图（tldraw）本地调试，复制 .env.example 为 .env 并填入 VITE_TLDRAW_LICENSE_KEY
npm run dev
```

> 「在线流程图」基于 tldraw SDK，生产环境需配置 `VITE_TLDRAW_LICENSE_KEY`，否则流程图页 5 秒后白屏。
> 在 <https://tldraw.dev> 申请：Trial（免费 100 天、无水印）/ Commercial（商用、无水印）/ Hobby（非商业、保留水印）。
> key 绑定域名、可公开写进前端代码；开发环境（localhost）不需要。详见 [DEPLOY.md](./DEPLOY.md)。

前端开发服务器默认 `http://localhost:5173`，通过 Vite 代理把 `/api` 转发到后端。

### 测试

```bash
# 后端
cd backend && .venv/bin/python -m unittest discover -s tests -v
# 前端
cd frontend && npm run test
```

## 管理员后台

管理后台入口**不显示在页面中**，需手动访问 `/admin`：

- **入口**：`https://your-domain.com/admin`
- **默认账号**：`admin` / `admin`
- **首次登录强制改密**：使用默认密码登录后会立即要求修改密码，改完才能进入后台功能
- **功能**：
  - 运行概览：用户数、工具数、登录/游客使用趋势等统计图表
  - 用户管理：搜索账户、删除用户
  - 工具管理：工具的启用与暂停、使用频率统计、清空统计
  - 文件柜管理：查看并清理文件快递柜存档
  - 账号管理：修改管理员头像、显示名称与登录密码

> 生产环境务必在首次登录后立即修改默认密码（`NOVA_ADMIN_PASSWORD`），并妥善保管。

## 部署

完整部署步骤见 [DEPLOY.md](./DEPLOY.md)。

## 环境变量

- 后端：`backend/.env.example`（含全部配置项与说明）
- 前端：`frontend/.env.example`（`VITE_API_BASE_URL`、`VITE_TLDRAW_LICENSE_KEY`）


## 许可

本项目仅供个人学习与使用。