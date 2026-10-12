import { describe, expect, it } from "vitest";
import { resolveVideoSource } from "./videoUtils";

describe("video source resolver", () => {
  it("recognizes direct video and HLS URLs", () => {
    expect(resolveVideoSource("https://cdn.example.com/movie.mp4").kind).toBe("direct");
    expect(resolveVideoSource("https://cdn.example.com/live/playlist.m3u8").kind).toBe("hls");
  });

  it("builds YouTube and Vimeo embed URLs", () => {
    expect(resolveVideoSource("https://youtu.be/aqz-KE-bpKQ").url).toContain("youtube-nocookie.com/embed/aqz-KE-bpKQ");
    expect(resolveVideoSource("https://vimeo.com/76979871").url).toBe("https://player.vimeo.com/video/76979871");
  });

  it("rejects invalid input", () => {
    expect(() => resolveVideoSource("not a url")).toThrow();
  });
});
