import { authenticatedFetch, type AuthSession } from "./auth";

export type MyUsageTool = {
  toolId: string;
  label: string;
  count: number;
  lastUsedAt: string;
};

export type MyUsage = {
  user: { name: string; email: string; role: string; avatar: string };
  favoriteCount: number;
  preferenceCount: number;
  totalUsage: number;
  tools: MyUsageTool[];
  daily: Array<{ date: string; count: number }>;
};

export async function fetchMyUsage(session: AuthSession): Promise<MyUsage> {
  const response = await authenticatedFetch("/api/me/usage", session);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? "无法读取个人数据。");
  }
  return (await response.json()) as MyUsage;
}