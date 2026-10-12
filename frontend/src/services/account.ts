import {
  authenticatedFetch,
  type AuthSession,
} from "./auth";

const GUEST_FAVORITES_KEY = "nova.guest.favorites";
const GUEST_PREFERENCES_KEY = "nova.guest.preferences";

function readGuestFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(GUEST_FAVORITES_KEY) ?? "[]",
    );
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeGuestFavorites(favorites: string[]) {
  try {
    window.localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Guest favorites remain optional when storage is unavailable.
  }
}

export async function getFavoriteToolIds(session: AuthSession | null) {
  if (!session) return readGuestFavorites();

  const response = await authenticatedFetch("/api/me/favorites", session);

  if (!response.ok) throw new Error("无法读取收藏。");

  const payload = (await response.json()) as { toolIds?: unknown };
  return Array.isArray(payload.toolIds)
    ? payload.toolIds.filter((item): item is string => typeof item === "string")
    : [];
}

export async function setToolFavorite(
  toolId: string,
  favorite: boolean,
  session: AuthSession | null,
) {
  if (!session) {
    const next = new Set(readGuestFavorites());
    if (favorite) next.add(toolId);
    else next.delete(toolId);
    const favorites = [...next];
    writeGuestFavorites(favorites);
    return favorites;
  }

  const response = await authenticatedFetch(
    `/api/me/favorites/${encodeURIComponent(toolId)}`,
    session,
    { method: favorite ? "PUT" : "DELETE" },
  );

  if (!response.ok) throw new Error("无法更新收藏。");

  return getFavoriteToolIds(session);
}

export async function savePreference(
  key: string,
  value: unknown,
  session: AuthSession | null,
) {
  if (!session) {
    try {
      const preferences: unknown = JSON.parse(
        window.localStorage.getItem(GUEST_PREFERENCES_KEY) ?? "{}",
      );
      const next =
        typeof preferences === "object" && preferences !== null
          ? { ...preferences, [key]: value }
          : { [key]: value };
      window.localStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(next));
    } catch {
      // Preference storage is optional in guest mode.
    }
    return;
  }

  const response = await authenticatedFetch(
    `/api/me/preferences/${encodeURIComponent(key)}`,
    session,
    {
      method: "PUT",
      body: JSON.stringify({ value }),
    },
  );

  if (!response.ok) throw new Error("无法保存偏好。");
}
export async function getPreference<T>(
  key: string,
  session: AuthSession | null,
): Promise<T | null> {
  if (!session) {
    try {
      const preferences: unknown = JSON.parse(
        window.localStorage.getItem(GUEST_PREFERENCES_KEY) ?? "{}",
      );
      if (typeof preferences !== "object" || preferences === null) return null;
      return (preferences as Record<string, T>)[key] ?? null;
    } catch {
      return null;
    }
  }

  const response = await authenticatedFetch(
    `/api/me/preferences/${encodeURIComponent(key)}`,
    session,
  );

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("无法读取偏好。");

  const payload = (await response.json()) as { value?: T };
  return payload.value ?? null;
}