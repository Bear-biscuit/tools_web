import { authenticatedFetch, getApiUrl, type AuthSession } from "./auth";

export type ShareKind =
  | "mermaid"
  | "mindmap"
  | "whiteboard"
  | "flowboard"
  | "codecard"
  | "markdown"
  | "json"
  | "text"
  | "image";

export type ShareSummary = {
  code: string;
  kind: ShareKind;
  title: string;
  createdAt: string;
  expiresAt: string | null;
  viewCount: number;
};

export type SharedContent = {
  code: string;
  kind: ShareKind;
  title: string;
  content: string;
  createdAt: string;
};

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message ?? "请求失败。";
  } catch {
    return "请求失败。";
  }
}

export async function createShare(
  kind: ShareKind,
  title: string,
  content: string,
  session: AuthSession | null,
): Promise<{ code: string; url: string; expiresAt: string | null }> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);

  const response = await fetch(getApiUrl("/api/shares"), {
    method: "POST",
    headers,
    body: JSON.stringify({ kind, title, content }),
  });
  if (!response.ok) throw new Error(await readError(response));

  const payload = (await response.json()) as { code: string; expiresAt: string | null };
  return {
    code: payload.code,
    url: `${window.location.origin}/s/${payload.code}`,
    expiresAt: payload.expiresAt,
  };
}

export async function getShare(code: string): Promise<SharedContent> {
  const response = await fetch(getApiUrl(`/api/shares/${encodeURIComponent(code)}`));
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as SharedContent;
}

export async function fetchMyShares(session: AuthSession): Promise<ShareSummary[]> {
  const response = await authenticatedFetch("/api/me/shares", session);
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as { shares: ShareSummary[] };
  return payload.shares;
}

export async function deleteShare(session: AuthSession, code: string): Promise<void> {
  const response = await authenticatedFetch(`/api/me/shares/${encodeURIComponent(code)}`, session, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}