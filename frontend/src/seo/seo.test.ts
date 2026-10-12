import { describe, expect, it } from "vitest";
import { implementedToolIds } from "../components/toolCatalog";
import toolSeo from "./toolSeo.json";
import { getRouteSeo } from "./useSeo";

const toolEntries = Object.entries(toolSeo.tools);
const pageEntries = Object.entries(toolSeo.pages);

describe("SEO catalog", () => {
  it("covers every implemented tool exactly once", () => {
    expect(Object.keys(toolSeo.tools).sort()).toEqual([...implementedToolIds].sort());
    expect(new Set(Object.keys(toolSeo.tools)).size).toBe(implementedToolIds.length);
  });

  it("keeps public page metadata complete and unique", () => {
    const titles = [...pageEntries.map(([, item]) => item.title), ...toolEntries.map(([, item]) => item.title)];
    const descriptions = [...pageEntries.map(([, item]) => item.description), ...toolEntries.map(([, item]) => item.description)];

    for (const [, item] of [...pageEntries, ...toolEntries]) {
      expect(item.title.trim().length).toBeGreaterThanOrEqual(10);
      expect(item.description.trim().length).toBeGreaterThanOrEqual(20);
      expect(item.keywords.length).toBeGreaterThanOrEqual(3);
      expect(item.keywords.every((keyword) => keyword.trim().length > 0)).toBe(true);
    }

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("generates unique canonical URLs for every tool", () => {
    const urls = toolEntries.map(([toolId]) => getRouteSeo(`/tools/${toolId}`).url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((url) => url.startsWith(`${toolSeo.site.url}/tools/`))).toBe(true);
  });
});

describe("route SEO", () => {
  it("keeps the home page canonical on the root URL", () => {
    expect(getRouteSeo("/")).toMatchObject({
      url: `${toolSeo.site.url}/`,
      index: true,
    });
  });

  it("normalizes trailing slashes", () => {
    expect(getRouteSeo("/tools/json/")).toMatchObject({
      url: `${toolSeo.site.url}/tools/json`,
      index: true,
      toolId: "json",
    });
  });

  it("keeps private and unknown pages out of the index", () => {
    expect(getRouteSeo("/admin").index).toBe(false);
    expect(getRouteSeo("/account").index).toBe(false);
    expect(getRouteSeo("/tools/not-a-real-tool").index).toBe(false);
    expect(getRouteSeo("/unknown-page").index).toBe(false);
  });
});