export type DecodedJwt = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: string[];
};

function decodeSegment(segment: string) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding ? `${normalized}${"=".repeat(4 - padding)}` : normalized;
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function parseObject(segment: string, label: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeSegment(segment));
  } catch {
    throw new Error(`${label} 不是有效的 Base64URL JSON。`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} 必须是 JSON 对象。`);
  }
  return parsed as Record<string, unknown>;
}

export function decodeJwt(token: string): DecodedJwt {
  const raw = token.trim().split(".");
  if (raw.length !== 3 || raw.some((segment) => !segment)) {
    throw new Error("JWT 必须包含 Header、Payload 和 Signature 三段。");
  }
  return {
    header: parseObject(raw[0], "Header"),
    payload: parseObject(raw[1], "Payload"),
    signature: raw[2],
    raw,
  };
}

export function getJwtTimeState(payload: Record<string, unknown>, now = Date.now()) {
  const expiration = typeof payload.exp === "number" ? payload.exp * 1000 : null;
  const issuedAt = typeof payload.iat === "number" ? payload.iat * 1000 : null;
  return {
    expiration,
    issuedAt,
    expired: expiration !== null && expiration <= now,
  };
}