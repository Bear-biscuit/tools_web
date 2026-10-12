export type EmojiOption = {
  id: string;
  glyph: string;
};

export type EmojiCombination = {
  supported: true;
  left: string;
  right: string;
  dataVersion: string;
  resourceId: string;
  imageUrl: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "请求失败");
  }
  return payload;
}

export async function fetchEmojiList() {
  const response = await fetch("/api/tools/emoji/list");
  const payload = await parseResponse<{ emojis: EmojiOption[] }>(response);
  return payload.emojis;
}

export async function fetchEmojiCombination(left: string, right: string) {
  const params = new URLSearchParams({ left, right });
  const response = await fetch(`/api/tools/emoji/combine?${params.toString()}`);
  if (response.status === 404) return null;
  return parseResponse<EmojiCombination>(response);
}

export async function fetchRandomEmojiCombination() {
  const response = await fetch("/api/tools/emoji/random");
  return parseResponse<EmojiCombination>(response);
}