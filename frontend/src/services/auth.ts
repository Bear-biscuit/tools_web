const REMEMBERED_EMAIL_KEY = "nova.remembered-email";
const SESSION_KEY = "nova.auth.session";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");


export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
};

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  createdAt: number;
  user: AuthUser;
};

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

type LoginApiResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!isObject(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.name === "string" &&
    typeof value.role === "string" &&
    (value.avatar === undefined || typeof value.avatar === "string")
  );
}

function isLoginResponse(value: unknown): value is LoginApiResponse {
  if (!isObject(value)) return false;

  return (
    typeof value.accessToken === "string" &&
    typeof value.tokenType === "string" &&
    typeof value.expiresIn === "number" &&
    isAuthUser(value.user)
  );
}

function parseErrorCode(code: unknown): AuthErrorCode {
  if (
    code === "invalid_credentials" ||
    code === "validation_error" ||
    code === "invalid_request"
  ) {
    return code === "invalid_credentials" ? "INVALID_CREDENTIALS" : "VALIDATION_ERROR";
  }

  return "UNKNOWN";
}

export function getApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function authenticate(credentials: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
      signal: controller.signal,
    });

    const payload: unknown = await response.json();

    if (!response.ok) {
      const apiError = isObject(payload) ? (payload as ApiErrorResponse) : {};
      throw new AuthError(
        parseErrorCode(apiError.error?.code),
        apiError.error?.message ?? "登录失败，请稍后再试。",
      );
    }

    if (!isLoginResponse(payload)) {
      throw new AuthError("NETWORK_ERROR", "服务器返回的数据格式不正确。");
    }

    return {
      ...payload,
      createdAt: Date.now(),
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AuthError("NETWORK_ERROR", "登录请求超时，请检查后端服务。");
    }

    throw new AuthError("NETWORK_ERROR", "无法连接登录服务，请确认后端已启动。");
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function authenticatedFetch(
  path: string,
  session: AuthSession,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(getApiUrl(path), {
    ...init,
    headers,
  });
}

export function getStoredSession(): AuthSession | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (!isObject(parsed) || !isAuthUser(parsed.user)) return null;

    const session = parsed as AuthSession;
    const expiresAt = session.createdAt + session.expiresIn * 1000;
    if (!session.accessToken || expiresAt <= Date.now()) {
      clearStoredSession();
      return null;
    }

    return {
      ...session,
      user: { ...session.user, avatar: session.user.avatar ?? "" },
    };
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Session storage is optional.
  }
}

export function clearStoredSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

export async function updateProfile(
  session: AuthSession,
  profile: { name: string; avatar: string },
): Promise<AuthSession> {
  const response = await authenticatedFetch("/api/me/profile", session, {
    method: "PUT",
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new AuthError("UNKNOWN", payload?.error?.message ?? "资料保存失败。");
  }

  const payload = (await response.json()) as { user: AuthUser };
  return { ...session, user: { ...payload.user, avatar: payload.user.avatar ?? "" } };
}

export async function updatePassword(
  session: AuthSession,
  passwords: { currentPassword: string; newPassword: string },
): Promise<void> {
  const response = await authenticatedFetch("/api/me/password", session, {
    method: "PUT",
    body: JSON.stringify(passwords),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new AuthError("UNKNOWN", payload?.error?.message ?? "密码修改失败。");
  }
}

export function getRememberedEmail() {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setRememberedEmail(email: string) {
  try {
    window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  } catch {
    // Storage can be unavailable in private browsing or restricted environments.
  }
}

export function clearRememberedEmail() {
  try {
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}