import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "./auth";
import { reportToolUsage } from "./toolUsage";

const session: AuthSession = {
  accessToken: "test-token",
  tokenType: "Bearer",
  expiresIn: 3600,
  createdAt: Date.now(),
  user: {
    id: "user-1",
    email: "test@example.com",
    name: "Test",
    role: "user",
    avatar: "",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tool usage reporting", () => {
  it("reports an anonymous successful execution", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await reportToolUsage("json", null);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tools/usage");
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ toolId: "json" }),
      keepalive: true,
    });
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
  });

  it("includes the access token for signed-in users", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await reportToolUsage("timer", session);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
    expect(init.body).toBe(JSON.stringify({ toolId: "timer" }));
  });

  it("does not interrupt the tool when reporting fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(reportToolUsage("color", null)).resolves.toBeUndefined();
  });
});
