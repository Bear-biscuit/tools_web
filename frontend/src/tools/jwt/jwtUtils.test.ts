import { describe, expect, it } from "vitest";
import { decodeJwt, getJwtTimeState } from "./jwtUtils";

function segment(value: object) {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

describe("jwt utils", () => {
  it("decodes header and payload without verifying the signature", () => {
    const token = `${segment({ alg: "HS256", typ: "JWT" })}.${segment({ sub: "user-1", role: "admin" })}.signature`;
    const decoded = decodeJwt(token);
    expect(decoded.header.alg).toBe("HS256");
    expect(decoded.payload.sub).toBe("user-1");
    expect(decoded.signature).toBe("signature");
  });

  it("reports expiration state", () => {
    const state = getJwtTimeState({ exp: 10 }, 11_000);
    expect(state.expired).toBe(true);
  });

  it("rejects malformed tokens", () => {
    expect(() => decodeJwt("not-a-token")).toThrow();
  });
});