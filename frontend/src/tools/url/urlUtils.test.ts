import { describe, expect, it } from "vitest";
import { buildUrl, parseUrl } from "./urlUtils";

describe("url utils", () => {
  it("normalizes missing protocols", () => {
    expect(parseUrl("example.com/path").href).toBe("https://example.com/path");
  });

  it("parses URL parts and query parameters", () => {
    const parsed = parseUrl("https://user:pass@example.com:8443/a?q=hello&lang=zh#part");
    expect(parsed).toMatchObject({
      protocol: "https",
      username: "user",
      password: "pass",
      hostname: "example.com",
      port: "8443",
      pathname: "/a",
      hash: "part",
    });
    expect(parsed.query.map(({ key, value }) => ({ key, value }))).toEqual([
      { key: "q", value: "hello" },
      { key: "lang", value: "zh" },
    ]);
  });

  it("rebuilds a URL from edited parameters", () => {
    const parsed = parseUrl("https://example.com/search?q=old");
    const rebuilt = buildUrl({
      ...parsed,
      query: [{ ...parsed.query[0], key: "q", value: "new value" }],
    });
    expect(rebuilt).toBe("https://example.com/search?q=new+value");
  });
});