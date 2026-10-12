export type IdKind = "uuid" | "short" | "hex";

export type IdOptions = {
  kind: IdKind;
  count: number;
  length: number;
  uppercase: boolean;
  prefix: string;
};

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomValues(length: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    return [...values].map((value) => value / 0x1_0000_0000);
  }
  return Array.from({ length }, () => Math.random());
}

export function generateUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateShortId(length: number, uppercase = false) {
  const size = Math.max(4, Math.min(64, Math.round(length)));
  const pool = uppercase ? ALPHABET.toUpperCase() : ALPHABET;
  return randomValues(size).map((value) => pool[Math.floor(value * pool.length)]).join("");
}

function generateHexId(length: number, uppercase = false) {
  const size = Math.max(4, Math.min(128, Math.round(length)));
  const id = randomValues(size).map((value) => Math.floor(value * 16).toString(16)).join("");
  return uppercase ? id.toUpperCase() : id;
}

export function generateIds(options: IdOptions) {
  const count = Math.max(1, Math.min(200, Math.round(options.count)));
  const prefix = options.prefix.trim();
  return Array.from({ length: count }, () => {
    const id = options.kind === "uuid"
      ? generateUuid()
      : options.kind === "hex"
        ? generateHexId(options.length, options.uppercase)
        : generateShortId(options.length, options.uppercase);
    return prefix ? `${prefix}${id}` : id;
  });
}