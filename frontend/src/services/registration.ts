import { AuthError, type AuthSession, getApiUrl } from "./auth";

type RequestCodeResponse = {
  message: string;
  expiresIn: number;
  debugCode?: string;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};


async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new AuthError("NETWORK_ERROR", "服务器返回了无法解析的数据。");
  }
}

function getError(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null) return fallback;
  const apiError = payload as ApiErrorResponse;
  return apiError.error?.message ?? fallback;
}

export async function requestRegistrationCode(input: {
  name: string;
  email: string;
}): Promise<RequestCodeResponse> {
  const response = await fetch(getApiUrl("/api/auth/register/request-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim(),
    }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new AuthError("UNKNOWN", getError(payload, "验证码发送失败。"));
  }

  return payload as RequestCodeResponse;
}

export async function verifyRegistration(input: {
  email: string;
  code: string;
  password: string;
}): Promise<AuthSession> {
  const response = await fetch(getApiUrl("/api/auth/register/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email.trim(),
      code: input.code.trim(),
      password: input.password,
    }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new AuthError("UNKNOWN", getError(payload, "注册失败，请稍后重试。"));
  }

  return {
    ...(payload as Omit<AuthSession, "createdAt">),
    createdAt: Date.now(),
  };
}

export async function requestPasswordResetCode(input: { email: string }): Promise<RequestCodeResponse> {
  const response = await fetch(getApiUrl("/api/auth/password/reset-request"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email.trim() }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new AuthError("UNKNOWN", getError(payload, "验证码发送失败。"));
  }

  return payload as RequestCodeResponse;
}

export async function verifyPasswordReset(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  const response = await fetch(getApiUrl("/api/auth/password/reset-verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email.trim(),
      code: input.code.trim(),
      newPassword: input.newPassword,
    }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new AuthError("UNKNOWN", getError(payload, "密码重置失败。"));
  }
}
