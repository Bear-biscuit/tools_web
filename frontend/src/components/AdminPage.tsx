import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Check,
  CircleAlert,
  BarChart3,
  Database,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  PackageOpen,
  PauseCircle,
  PieChart,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Users,
  Save,
} from "lucide-react";
import {
  changeAdminPassword,
  clearAdminSession,
  deleteAdminFilebox,
  deleteAdminUser,
  fetchAdminDashboard,
  fetchAdminFilebox,
  fetchAdminTools,
  fetchAdminUsage,
  fetchAdminUsers,
  getStoredAdminSession,
  loginAdmin,
  resetAdminUsage,
  updateAdminProfile,
  updateAdminTool,
  type AdminFileBoxItem,
  type AdminSession,
  type AdminToolStat,
  type AdminUsageReport,
  type AdminUser,
} from "../services/admin";
import { createAvatarDataUrl } from "../lib/avatar";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AdminTab = "dashboard" | "users" | "tools" | "filebox" | "account";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

const ADMIN_USERNAME = "admin";

export function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(getStoredAdminSession);
  const [loginPassword, setLoginPassword] = useState("");
  const [profileName, setProfileName] = useState(session?.admin.displayName ?? session?.admin.username ?? "");
  const [profileAvatar, setProfileAvatar] = useState(session?.admin.avatar ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tools, setTools] = useState<AdminToolStat[]>([]);
  const [usage, setUsage] = useState<AdminUsageReport | null>(null);
  const [fileboxItems, setFileboxItems] = useState<AdminFileBoxItem[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [usageDays, setUsageDays] = useState(30);

  async function loadAdminData(activeSession = session) {
    if (!activeSession || activeSession.admin.mustChangePassword) return;
    setBusy(true);
    setError("");
    try {
      const [dashboard, userData, toolData, usageData, fileboxData] = await Promise.all([
        fetchAdminDashboard(activeSession),
        fetchAdminUsers(activeSession),
        fetchAdminTools(activeSession),
        fetchAdminUsage(activeSession, usageDays),
        fetchAdminFilebox(activeSession),
      ]);
      setCounts(dashboard.counts);
      setUsers(userData.users);
      setTools(toolData.tools);
      setUsage(usageData);
      setFileboxItems(fileboxData.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "后台数据加载失败。");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (session && !session.admin.mustChangePassword) void loadAdminData(session);
  }, [session?.accessToken, session?.admin.mustChangePassword, usageDays]);

  useEffect(() => {
    setProfileName(session?.admin.displayName ?? session?.admin.username ?? "");
    setProfileAvatar(session?.admin.avatar ?? "");
  }, [session?.admin.displayName, session?.admin.avatar, session?.admin.username]);

  const filteredUsers = users.filter((user) => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return true;
    return [user.name, user.email, user.role].some((value) => value.toLowerCase().includes(query));
  });

  const chartToolData = [...(usage?.tools ?? [])]
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, "zh-CN"))
    .map((tool) => ({ name: tool.label, usage: tool.total, enabled: tool.enabled }));
  const chartToolHeight = Math.max(260, chartToolData.length * 34);

  const pieData = [
    { name: "登录用户", value: usage?.authenticated ?? 0, color: "#2e5bff" },
    { name: "游客", value: usage?.anonymous ?? 0, color: "#62d5b4" },
  ];

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await loginAdmin(ADMIN_USERNAME, loginPassword);
      setSession(next);
      setLoginPassword("");
      setNotice(next.admin.mustChangePassword ? "首次登录必须修改密码。" : "登录成功。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败。");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    if (newPassword.length < 8) {
      setError("新密码至少需要 8 个字符。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await changeAdminPassword(session, currentPassword, newPassword);
      setSession(next);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("管理员密码已更新。");
      await loadAdminData(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "密码更新失败。");
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProfileBusy(true);
    setError("");
    setNotice("");
    try {
      setProfileAvatar(await createAvatarDataUrl(file));
      setNotice("头像已准备好，点击保存资料后生效。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "头像处理失败。");
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const normalizedName = profileName.trim();
    if (!normalizedName) {
      setError("名称不能为空。");
      return;
    }

    setProfileBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await updateAdminProfile(session, { displayName: normalizedName, avatar: profileAvatar });
      setSession(next);
      setProfileName(next.admin.displayName);
      setProfileAvatar(next.admin.avatar);
      setNotice("管理员资料已保存。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "资料保存失败。");
    } finally {
      setProfileBusy(false);
    }
  }

  function logoutAdmin() {
    clearAdminSession();
    setSession(null);
    setUsers([]);
    setFileboxItems([]);
    setCounts({});
    setError("");
    setNotice("");
  }

  if (!session) {
    return (
      <main className="admin-page">
        <section className="admin-login-card">
          <span className="admin-login-icon"><ShieldCheck size={28} strokeWidth={1.8} aria-hidden="true" /></span>
          <h1>Bocchi 管理后台</h1>
          <p>此页面不对外开放，仅限管理员登录。</p>
          <form onSubmit={handleLogin}>
            <div className="admin-login-account">
              <span className="admin-login-account__mark"><ShieldCheck size={17} aria-hidden="true" /></span>
              <div>
                <small>管理员账号</small>
                <strong>{ADMIN_USERNAME}</strong>
              </div>
            </div>
            <label>
              <span>管理员密码</span>
              <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} autoComplete="current-password" autoFocus />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="admin-spin" size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
              {busy ? "登录中…" : "登录后台"}
            </button>
          </form>
          <div className="admin-feedback" aria-live="polite">
            {error ? <p className="admin-feedback--error"><CircleAlert size={16} aria-hidden="true" />{error}</p> : notice ? <p className="admin-feedback--success"><Check size={16} aria-hidden="true" />{notice}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  if (session.admin.mustChangePassword) {
    return (
      <main className="admin-page">
        <section className="admin-login-card admin-password-card">
          <span className="admin-login-icon admin-login-icon--warning"><KeyRound size={28} strokeWidth={1.8} aria-hidden="true" /></span>
          <h1>必须先修改密码</h1>
          <p>默认密码不能继续使用。修改完成后才能进入管理功能。</p>
          <form onSubmit={handlePasswordChange}>
            <label>
              <span>当前密码</span>
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
            </label>
            <label>
              <span>新密码</span>
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
            </label>
            <label>
              <span>确认新密码</span>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="admin-spin" size={17} aria-hidden="true" /> : <KeyRound size={17} aria-hidden="true" />}
              {busy ? "更新中…" : "更新密码并进入后台"}
            </button>
          </form>
          <div className="admin-feedback" aria-live="polite">
            {error ? <p className="admin-feedback--error"><CircleAlert size={16} aria-hidden="true" />{error}</p> : notice ? <p className="admin-feedback--success"><Check size={16} aria-hidden="true" />{notice}</p> : null}
          </div>
          <button className="admin-text-button" type="button" onClick={logoutAdmin}>退出管理员登录</button>
        </section>
      </main>
    );
  }

  async function removeUser(user: AdminUser) {
    if (!session) return;
    if (!window.confirm(`确定删除用户 ${user.email} 吗？此操作会同时删除其收藏和偏好。`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteAdminUser(session, user.id);
      setNotice(`用户 ${user.email} 已删除。`);
      await loadAdminData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除用户失败。");
    } finally {
      setBusy(false);
    }
  }

  async function removeFileboxItem(item: AdminFileBoxItem) {
    if (!session) return;
    if (!window.confirm(`确定删除文件柜项目 ${item.code} 吗？`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteAdminFilebox(session, item.code);
      setNotice(`文件柜项目 ${item.code} 已删除。`);
      await loadAdminData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除文件柜项目失败。");
    } finally {
      setBusy(false);
    }
  }

  async function resetUsage() {
    if (!session || !window.confirm("确定清空历史使用统计吗？此操作不会影响用户和文件数据。")) return;
    setBusy(true);
    setError("");
    try {
      await resetAdminUsage(session);
      setNotice("工具使用统计已清空。");
      await loadAdminData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "重置统计失败。");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTool(tool: AdminToolStat) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      await updateAdminTool(session, tool.id, !tool.enabled);
      setTools((current) => current.map((item) => item.id === tool.id ? { ...item, enabled: !item.enabled } : item));
      setNotice(`${tool.label} 已${tool.enabled ? "暂停" : "启用"}。`);
      await loadAdminData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "工具状态更新失败。");
    } finally {
      setBusy(false);
    }
  }

  const tabMeta = {
    dashboard: { title: "运行概览", detail: "观察工具使用趋势和系统数据。" },
    users: { title: "用户管理", detail: "搜索账户并维护用户数据。" },
    tools: { title: "工具管理", detail: "控制工具启停并查看使用频率。" },
    filebox: { title: "文件柜管理", detail: "检查并清理当前文件存档。" },
    account: { title: "账号管理", detail: "维护管理员资料、头像和登录密码。" },
  }[tab];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-console-mark"><ShieldCheck size={22} aria-hidden="true" /></span>
          <div><strong>Bocchi</strong><small>管理后台</small></div>
        </div>

        <nav className="admin-side-nav" aria-label="管理功能">
          <button className={tab === "dashboard" ? "is-active" : ""} type="button" onClick={() => setTab("dashboard")}>
            <Database size={17} aria-hidden="true" /><span>运行概览</span>
          </button>
          <button className={tab === "users" ? "is-active" : ""} type="button" onClick={() => setTab("users")}>
            <Users size={17} aria-hidden="true" /><span>用户管理</span>
          </button>
          <button className={tab === "tools" ? "is-active" : ""} type="button" onClick={() => setTab("tools")}>
            <BarChart3 size={17} aria-hidden="true" /><span>工具管理</span>
          </button>
          <button className={tab === "filebox" ? "is-active" : ""} type="button" onClick={() => setTab("filebox")}>
            <PackageOpen size={17} aria-hidden="true" /><span>文件柜</span>
          </button>
          <button className={tab === "account" ? "is-active" : ""} type="button" onClick={() => setTab("account")}>
            <UserRound size={17} aria-hidden="true" /><span>账号管理</span>
          </button>
        </nav>

        <div className="admin-sidebar__account">
          {session.admin.avatar ? (
            <span className="admin-sidebar__avatar"><img src={session.admin.avatar} alt="" /></span>
          ) : (
            <span>{(session.admin.displayName || session.admin.username).slice(0, 1).toUpperCase()}</span>
          )}
          <button className="admin-sidebar__account-main" type="button" onClick={() => setTab("account")}>
            <strong>{session.admin.displayName || session.admin.username}</strong>
            <small>管理员</small>
          </button>
          <button type="button" onClick={logoutAdmin} aria-label="退出管理后台"><LogOut size={16} aria-hidden="true" /></button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div><h1>{tabMeta.title}</h1><p>{tabMeta.detail}</p></div>
          <button type="button" onClick={() => loadAdminData()} disabled={busy}>
            <RefreshCw className={busy ? "admin-spin" : ""} size={16} aria-hidden="true" />
            刷新数据
          </button>
        </header>

        <section className="admin-content">
        {tab === "dashboard" && (
          <div className="admin-dashboard">
            <div className="admin-stats-grid">
              <article><span>用户</span><strong>{counts.users ?? 0}</strong><small>注册账户</small></article>
              <article><span>收藏</span><strong>{counts.favorites ?? 0}</strong><small>已收藏工具</small></article>
              <article><span>偏好</span><strong>{counts.preferences ?? 0}</strong><small>账户偏好记录</small></article>
              <article><span>文件柜</span><strong>{counts.fileboxItems ?? 0}</strong><small>当前存档</small></article>
              <article><span>工具调用</span><strong>{usage?.total ?? 0}</strong><small>近 {usageDays} 天</small></article>
            </div>

            <div className="admin-chart-grid">
              <article className="admin-chart-card admin-chart-card--wide">
                <header>
                  <div><strong>每日工具使用趋势</strong><small>登录与游客访问合计</small></div>
                  <select value={usageDays} onChange={(event) => setUsageDays(Number(event.target.value))}>
                    <option value={7}>近 7 天</option>
                    <option value={30}>近 30 天</option>
                    <option value={90}>近 90 天</option>
                  </select>
                </header>
                <div className="admin-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usage?.daily ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#dce5f2" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#687892" }} tickFormatter={(value) => String(value).slice(5)} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#687892" }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="total" name="调用次数" stroke="#2e5bff" strokeWidth={2.5} fill="#2e5bff" fillOpacity={0.16} animationDuration={700} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="admin-chart-card">
                <header><div><strong>用户类型</strong><small>登录用户与游客占比</small></div><PieChart size={18} aria-hidden="true" /></header>
                <div className="admin-chart admin-chart--pie">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} animationDuration={700}>
                        {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="admin-pie-legend">
                    {pieData.map((entry) => <span key={entry.name}><i style={{ background: entry.color }} />{entry.name} {entry.value}</span>)}
                  </div>
                </div>
              </article>

              <article className="admin-chart-card admin-chart-card--wide">
                <header><div><strong>工具使用排行</strong><small>包含全部工具，按近 {usageDays} 天调用次数排序</small></div><BarChart3 size={18} aria-hidden="true" /></header>
                <div className="admin-chart" style={{ height: chartToolHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartToolData} layout="vertical" margin={{ top: 4, right: 18, left: 22, bottom: 0 }}>
                      <CartesianGrid horizontal={false} stroke="#dce5f2" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#687892" }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#687892" }} />
                      <Tooltip />
                      <Bar dataKey="usage" name="调用次数" radius={[0, 6, 6, 0]} animationDuration={700}>
                        {chartToolData.map((entry) => <Cell key={entry.name} fill={entry.enabled ? "#2e5bff" : "#aebed6"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="admin-users-panel">
            <div className="admin-section-toolbar">
              <div><strong>用户管理</strong><small>共 {users.length} 个账户</small></div>
              <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="搜索名称、邮箱或角色" />
            </div>
            <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>用户</th><th>邮箱</th><th>角色</th><th>收藏</th><th>创建时间</th><th>操作</th></tr></thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="admin-user-cell">
                        <span className="admin-user-avatar">{user.avatar ? <img src={user.avatar} alt="" /> : user.name.slice(0, 1)}</span>
                        {user.name}
                      </span>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.favoriteCount}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td><button className="admin-delete" type="button" onClick={() => removeUser(user)}><Trash2 size={15} aria-hidden="true" />删除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredUsers.length && <p className="admin-empty">没有匹配的用户。</p>}
            </div>
          </div>
        )}

        {tab === "tools" && (
          <div className="admin-tools-panel">
            <div className="admin-section-toolbar">
              <div><strong>工具启动与暂停</strong><small>暂停后所有用户都无法打开该工具</small></div>
              <button className="admin-reset-usage" type="button" onClick={resetUsage} disabled={busy}>
                <Trash2 size={15} aria-hidden="true" />重置统计
              </button>
            </div>
            <div className="admin-tool-grid">
              {tools.map((tool) => (
                <article className={`admin-tool-card${tool.enabled ? "" : " is-paused"}`} key={tool.id}>
                  <div className="admin-tool-card__top">
                    <div>
                      <strong>{tool.label}</strong>
                      <small>{tool.id}</small>
                    </div>
                    <button
                      className={`admin-toggle${tool.enabled ? " is-on" : ""}`}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      disabled={busy}
                      aria-pressed={tool.enabled}
                      aria-label={`${tool.enabled ? "暂停" : "启用"} ${tool.label}`}
                    >
                      <span />
                    </button>
                  </div>
                  <div className="admin-tool-card__stats">
                    <span><strong>{tool.total}</strong><small>近 30 天调用</small></span>
                    <span><strong>{tool.uniqueUsers}</strong><small>登录用户</small></span>
                  </div>
                  <div className="admin-tool-card__footer">
                    <span className={tool.enabled ? "admin-status is-on" : "admin-status"}>{tool.enabled ? "运行中" : "已暂停"}</span>
                    <button type="button" onClick={() => toggleTool(tool)} disabled={busy}>
                      {tool.enabled ? <PauseCircle size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                      {tool.enabled ? "暂停" : "启用"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === "filebox" && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>取件码</th><th>类型</th><th>名称</th><th>大小</th><th>创建时间</th><th>操作</th></tr></thead>
              <tbody>
                {fileboxItems.map((item) => (
                  <tr key={item.code}>
                    <td><code>{item.code}</code></td>
                    <td>{item.kind === "text" ? "文本" : "文件"}</td>
                    <td>{item.name}</td>
                    <td>{formatBytes(item.size)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td><button className="admin-delete" type="button" onClick={() => removeFileboxItem(item)}><Trash2 size={15} aria-hidden="true" />删除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!fileboxItems.length && <p className="admin-empty">文件柜当前为空。</p>}
          </div>
        )}

        {tab === "account" && (
          <div className="admin-account-panel">
            <section className="admin-chart-card">
              <header>
                <div>
                  <strong>个人资料</strong>
                  <small>头像会压缩后保存到管理后台。</small>
                </div>
              </header>
              <form className="admin-account-form" onSubmit={handleProfileSave}>
                <div className="admin-account-avatar-row">
                  <span className="admin-account-avatar">
                    {profileAvatar ? <img src={profileAvatar} alt="管理员头像" /> : (profileName || "A").slice(0, 1)}
                  </span>
                  <div className="admin-account-avatar-actions">
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={profileBusy}>
                      <Upload size={15} aria-hidden="true" />上传头像
                    </button>
                    {profileAvatar && (
                      <button type="button" onClick={() => setProfileAvatar("")} disabled={profileBusy}>
                        <Trash2 size={15} aria-hidden="true" />移除头像
                      </button>
                    )}
                    <small>支持 PNG、JPG、WebP，原图不超过 8 MB。</small>
                    <input ref={avatarInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} />
                  </div>
                </div>
                <label className="admin-account-field">
                  <span>显示名称</span>
                  <input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={40} />
                </label>
                <button className="admin-account-save" type="submit" disabled={profileBusy}>
                  <Save size={15} aria-hidden="true" />{profileBusy ? "正在保存…" : "保存资料"}
                </button>
              </form>
            </section>

            <section className="admin-chart-card">
              <header>
                <div>
                  <strong>修改密码</strong>
                  <small>新密码至少 8 个字符，修改后请使用新密码重新登录。</small>
                </div>
              </header>
              <form className="admin-account-form" onSubmit={handlePasswordChange}>
                <label className="admin-account-field">
                  <span>当前密码</span>
                  <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
                </label>
                <label className="admin-account-field">
                  <span>新密码</span>
                  <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
                </label>
                <label className="admin-account-field">
                  <span>确认新密码</span>
                  <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
                </label>
                <button className="admin-account-save" type="submit" disabled={busy}>
                  <KeyRound size={15} aria-hidden="true" />{busy ? "正在修改…" : "修改密码"}
                </button>
              </form>
            </section>

            <aside className="admin-chart-card admin-account-identity">
              <header><strong>登录信息</strong></header>
              <p>登录账号：<code>{session.admin.username}</code></p>
              <p>该账号为系统内置管理员，仅用于后台管理。</p>
            </aside>
          </div>
        )}
        </section>

        <div className="admin-feedback admin-feedback--console" aria-live="polite">
          {error ? <p className="admin-feedback--error"><CircleAlert size={16} aria-hidden="true" />{error}</p> : notice ? <p className="admin-feedback--success"><Check size={16} aria-hidden="true" />{notice}</p> : null}
        </div>
      </section>
    </main>
  );
}


