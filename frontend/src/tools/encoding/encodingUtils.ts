export type Base64Variant = "standard" | "url";
export type UrlMode = "component" | "full";

function bytesToBinary(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return binary;
}

function binaryToBytes(binary: string) {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function normalizeBase64(value: string, variant: Base64Variant) {
  const compact = value.trim().replace(/\s+/g, "");
  const standard = variant === "url"
    ? compact.replace(/-/g, "+").replace(/_/g, "/")
    : compact;
  const padding = standard.length % 4;
  if (padding === 1) throw new Error("Base64 内容长度不正确。");
  return padding ? `${standard}${"=".repeat(4 - padding)}` : standard;
}

export function encodeBase64(value: string, variant: Base64Variant = "standard") {
  const encoded = btoa(bytesToBinary(new TextEncoder().encode(value)));
  return variant === "url"
    ? encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
    : encoded;
}

export function decodeBase64(value: string, variant: Base64Variant = "standard") {
  try {
    const bytes = binaryToBytes(atob(normalizeBase64(value, variant)));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Base64 内容无法解码，请检查字符和补位。");
  }
}

export function encodeUrl(value: string, mode: UrlMode = "component") {
  return mode === "component" ? encodeURIComponent(value) : encodeURI(value);
}

export function decodeUrl(value: string, mode: UrlMode = "component") {
  try {
    return mode === "component" ? decodeURIComponent(value) : decodeURI(value);
  } catch {
    throw new Error("URL 编码内容不完整或包含无效转义。");
  }
}