const ADMIN_SESSION_KEY = "bocchi.admin.session";

type AdminAccount = {
  username: string;
  displayName: string;
  avatar: string;
  mustChangePassword: boolean;
};

export type AdminSession = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  createdAt: number;
  admin: AdminAccount;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
  createdAt: string;
  favoriteCount: number;
};

export type AdminToolStat = {
  id: string;
  label: string;
  enabled: boolean;
  updatedAt: string;
  total: number;
  authenticated: number;
  anonymous: number;
  uniqueUsers: number;
};

export type AdminUsageReport = {
  days: number;
  total: number;
  authenticated: number;
  anonymous: number;
  daily: Array<{ date: string; total: number; authenticated: number; anonymous: number }>;
  tools: AdminToolStat[];
};

export type AdminFileBoxItem = {
  code: string;
  kind: "text" | "file";
  name: string;
  size: number;
  expireStyle: string;
  expiresAt: string | null;
  remainingDownloads: number | null;
  createdAt: string;
};

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message ?? "管理请求失败。";
  } catch {
    return "管理请求失败。";
  }
}

export function getStoredAdminSession(): AdminSession | null {
  try {
    const value = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as AdminSession;
    if (!session.accessToken || session.createdAt + session.expiresIn * 1000 <= Date.now()) {
      clearAdminSession();
      return null;
    }
    return {
      ...session,
      admin: {
        ...session.admin,
        displayName: session.admin.displayName ?? session.admin.username,
        avatar: session.admin.avatar ?? "",
      },
    };
  } catch {
    return null;
  }
}

function setStoredAdminSession(session: AdminSession) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

async function adminFetch(path: string, session: AdminSession, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(path, { ...init, headers });
}

export async function loginAdmin(username: string, password: string): Promise<AdminSession> {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as Omit<AdminSession, "createdAt">;
  const session = { ...payload, createdAt: Date.now() };
  setStoredAdminSession(session);
  return session;
}

export async function updateAdminProfile(
  session: AdminSession,
  profile: { displayName: string; avatar: string },
): Promise<AdminSession> {
  const response = await adminFetch("/api/admin/profile", session, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as { admin: AdminAccount };
  const next = { ...session, admin: { ...session.admin, ...payload.admin } };
  setStoredAdminSession(next);
  return next;
}

export async function changeAdminPassword(
  session: AdminSession,
  currentPassword: string,
  newPassword: string,
): Promise<AdminSession> {
  const response = await adminFetch("/api/admin/password", session, {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const next = { ...session, admin: { ...session.admin, mustChangePassword: false } };
  setStoredAdminSession(next);
  return next;
}

export async function fetchAdminDashboard(session: AdminSession) {
  const response = await adminFetch("/api/admin/dashboard", session);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { counts: Record<string, number> };
}

export async function fetchAdminUsers(session: AdminSession) {
  const response = await adminFetch("/api/admin/users", session);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { users: AdminUser[] };
}

export async function deleteAdminUser(session: AdminSession, userId: string) {
  const response = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`, session, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}

export async function fetchAdminUsage(session: AdminSession, days = 30) {
  const response = await adminFetch(`/api/admin/usage?days=${encodeURIComponent(String(days))}`, session);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AdminUsageReport;
}

export async function resetAdminUsage(session: AdminSession) {
  const response = await adminFetch("/api/admin/usage", session, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}

export async function fetchAdminTools(session: AdminSession) {
  const response = await adminFetch("/api/admin/tools", session);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { tools: AdminToolStat[] };
}

export async function updateAdminTool(session: AdminSession, toolId: string, enabled: boolean) {
  const response = await adminFetch(`/api/admin/tools/${encodeURIComponent(toolId)}`, session, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { toolId: string; enabled: boolean };
}

export async function fetchAdminFilebox(session: AdminSession) {
  const response = await adminFetch("/api/admin/filebox", session);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { items: AdminFileBoxItem[] };
}

export async function deleteAdminFilebox(session: AdminSession, code: string) {
  const response = await adminFetch(`/api/admin/filebox/${encodeURIComponent(code)}`, session, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}
