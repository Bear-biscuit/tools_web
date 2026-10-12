import { sha1 } from "@noble/hashes/legacy.js";
import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js";

export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function digestBytes(data: Uint8Array, algorithm: HashAlgorithm) {
  if (algorithm === "SHA-1") return sha1(data);
  if (algorithm === "SHA-384") return sha384(data);
  if (algorithm === "SHA-512") return sha512(data);
  return sha256(data);
}

export async function hashText(value: string, algorithm: HashAlgorithm = "SHA-256") {
  return toHex(digestBytes(new TextEncoder().encode(value), algorithm));
}

export async function hashFile(file: Blob, algorithm: HashAlgorithm = "SHA-256") {
  return toHex(digestBytes(new Uint8Array(await file.arrayBuffer()), algorithm));
}
function normalizeHash(value: string) {
  return value.trim().toLowerCase().replace(/[^a-f0-9]/g, "");
}

export function compareHash(actual: string, expected: string) {
  const normalizedExpected = normalizeHash(expected);
  if (!normalizedExpected) return "empty" as const;
  return normalizeHash(actual) === normalizedExpected ? "match" as const : "mismatch" as const;
}