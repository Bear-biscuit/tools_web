export type VideoSourceKind = "direct" | "hls" | "youtube" | "vimeo";

export type VideoSource = {
  kind: VideoSourceKind;
  url: string;
  originalUrl: string;
  mimeType?: string;
};

function videoMimeType(pathname: string) {
  const extension = pathname.split(".").pop()?.toLowerCase();
  if (extension === "mp4" || extension === "m4v") return "video/mp4";
  if (extension === "webm") return "video/webm";
  if (extension === "ogv" || extension === "ogg") return "video/ogg";
  if (extension === "m3u8") return "application/vnd.apple.mpegurl";
  return "video/mp4";
}

function youtubeId(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (host.endsWith("youtube.com")) {
    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2] ?? "";
    }
    return url.searchParams.get("v") ?? "";
  }
  return "";
}

function vimeoId(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (!host.endsWith("vimeo.com")) return "";
  return url.pathname.split("/").filter((part) => /^\d+$/.test(part))[0] ?? "";
}

export function resolveVideoSource(input: string): VideoSource {
  const value = input.trim();
  if (!value) throw new Error("请输入视频链接。");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("请输入完整的 http 或 https 视频地址。");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("只支持 http 或 https 视频地址。");
  }

  const youtube = youtubeId(url);
  if (youtube && /^[A-Za-z0-9_-]{6,}$/.test(youtube)) {
    return {
      kind: "youtube",
      url: `https://www.youtube-nocookie.com/embed/${youtube}?rel=0&modestbranding=1`,
      originalUrl: value,
    };
  }

  const vimeo = vimeoId(url);
  if (vimeo) {
    return {
      kind: "vimeo",
      url: `https://player.vimeo.com/video/${vimeo}`,
      originalUrl: value,
    };
  }

  const mimeType = videoMimeType(url.pathname);
  return {
    kind: mimeType.includes("mpegurl") ? "hls" : "direct",
    url: value,
    originalUrl: value,
    mimeType,
  };
}

export function displayVideoKind(kind: VideoSourceKind) {
  return {
    direct: "视频直链",
    hls: "HLS 流媒体",
    youtube: "YouTube",
    vimeo: "Vimeo",
  }[kind];
}
