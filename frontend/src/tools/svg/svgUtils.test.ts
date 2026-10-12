import { describe, expect, it } from "vitest";
import { analyzeSvg, optimizeSvg, sanitizeSvg } from "./svgUtils";

describe("svg utils", () => {
  it("removes scripts and event handlers", () => {
    const result = sanitizeSvg('<svg onload="alert(1)"><script>alert(1)</script><path d="M0 0" /></svg>');
    expect(result).not.toContain("script");
    expect(result).not.toContain("onload");
  });

  it("optimizes comments and metadata", () => {
    const result = optimizeSvg('<svg><!-- note --><metadata>x</metadata><path d="M0.12345 0" /></svg>');
    expect(result).toBe('<svg><path d="M0.12345 0" /></svg>');
  });

  it("analyzes SVG structure", () => {
    const result = analyzeSvg('<svg viewBox="0 0 24 24"><path d="M0 0" /><circle cx="2" cy="2" r="1" /></svg>');
    expect(result.paths).toBe(1);
    expect(result.elements).toBe(3);
    expect(result.viewBox).toBe("0 0 24 24");
  });
});