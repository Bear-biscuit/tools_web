import { reportToolUsage } from "../../services/toolUsage";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  CircleAlert,
  Clapperboard,
  ExternalLink,
  Link2,
  MonitorPlay,
  Play,
  Radio,
  RotateCcw,
} from "lucide-react";
import type HlsType from "hls.js";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import {
  displayVideoKind,
  resolveVideoSource,
  type VideoSource,
} from "./videoUtils";

const STORAGE_KEY = "nova.video.url";

const samples = [
  { label: "MP4 示例", value: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
  { label: "HLS 示例", value: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
  { label: "YouTube", value: "https://www.youtube.com/watch?v=aqz-KE-bpKQ" },
];

export function VideoPlayerTool() {
  const [urlInput, setUrlInput] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [source, setSource] = useState<VideoSource | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<HlsType | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const player = new Plyr(video, {
      controls: [
        "play-large",
        "restart",
        "rewind",
        "play",
        "fast-forward",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "captions",
        "settings",
        "pip",
        "airplay",
        "fullscreen",
      ],
      settings: ["captions", "quality", "speed", "loop"],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
      seekTime: 5,
      invertTime: false,
      displayDuration: true,
    });
    playerRef.current = player;

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      player.destroy();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const player = playerRef.current;
    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (!video || !source) return;

    if (source.kind === "youtube" || source.kind === "vimeo") {
      player?.pause();
      video.removeAttribute("src");
      video.load();
      setStatus(`已载入 ${displayVideoKind(source.kind)} 视频。`);
      setError("");
      return;
    }

    setStatus("正在载入视频…");
    setError("");

    if (source.kind === "hls") {
      let cancelled = false;
      // @ts-expect-error The light HLS build uses the main package typings.
      void import("hls.js/dist/hls.light.min.mjs")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
            hlsRef.current = hls;
            hls.loadSource(source.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setStatus("HLS 流已就绪。");
              setError("");
            });
            hls.on(Hls.Events.ERROR, (_event: unknown, data: { fatal?: boolean }) => {
              if (!data.fatal) return;
              setError("HLS 流加载失败，请检查地址、跨域设置或网络状态。");
              setStatus("");
              hls.destroy();
              hlsRef.current = null;
            });
            return;
          }

          if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = source.url;
            video.load();
            setStatus("HLS 流已交给浏览器原生播放。");
            return;
          }

          setError("当前浏览器不支持 HLS 播放。");
          setStatus("");
        })
        .catch(() => {
          if (!cancelled) {
            setError("HLS 播放组件加载失败，请检查网络后重试。");
            setStatus("");
          }
        });

      return () => {
        cancelled = true;
      };
    }

    if (player) {
      player.source = {
        type: "video",
        title: source.originalUrl.split("/").pop() || "在线视频",
        sources: [{ src: source.url, type: source.mimeType ?? "video/mp4" }],
      };
      setStatus("视频直链已就绪。");
    }
  }, [source]);

  function loadVideo(value = urlInput) {
    try {
      const resolved = resolveVideoSource(value);
      setUrlInput(resolved.originalUrl);
      setSource(resolved);
      void reportToolUsage("video");
      setError("");
      try {
        window.localStorage.setItem(STORAGE_KEY, resolved.originalUrl);
      } catch {
        // Local URL storage is optional.
      }
    } catch (reason) {
      setSource(null);
      setStatus("");
      setError(reason instanceof Error ? reason.message : "无法识别这个视频地址。");
    }
  }

  function resetPlayer() {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    playerRef.current?.stop();
    videoRef.current?.removeAttribute("src");
    videoRef.current?.load();
    setSource(null);
    setStatus("");
    setError("");
    setUrlInput("");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Local URL storage is optional.
    }
  }

  const isEmbedded = source?.kind === "youtube" || source?.kind === "vimeo";
  const sourceHost = source ? new URL(source.originalUrl).hostname.replace(/^www\./, "") : "";

  return (
    <section className="video-tool" aria-labelledby="video-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <Clapperboard size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="video-tool-title">在线视频播放器</h1>
          <p>播放视频直链、HLS 流，或嵌入 YouTube 与 Vimeo 视频。</p>
        </div>
      </header>

      <div className="video-url-bar">
        <label>
          <Link2 size={17} strokeWidth={2} aria-hidden="true" />
          <input
            value={urlInput}
            onChange={(event) => {
              setUrlInput(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadVideo();
            }}
            placeholder="粘贴 MP4、WebM、m3u8、YouTube 或 Vimeo 链接"
            spellCheck={false}
            aria-label="视频地址"
          />
        </label>
        <button className="tool-button tool-button--primary" type="button" onClick={() => loadVideo()}>
          <Play size={16} fill="currentColor" aria-hidden="true" />
          加载视频
        </button>
        <button className="tool-button" type="button" onClick={resetPlayer} disabled={!source && !urlInput}>
          <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
          清空
        </button>
      </div>

      <div className="video-samples" aria-label="视频示例">
        {samples.map((sample) => (
          <button key={sample.value} type="button" onClick={() => loadVideo(sample.value)}>
            <MonitorPlay size={15} strokeWidth={2} aria-hidden="true" />
            {sample.label}
          </button>
        ))}
      </div>

      <div className={`video-player-shell${isEmbedded ? " has-embed" : ""}${source ? " has-source" : ""}`}>
        <iframe
          src={isEmbedded ? source?.url : undefined}
          title={`${displayVideoKind(source?.kind ?? "direct")} 在线视频`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          hidden={!isEmbedded}
        />

        <video
          ref={videoRef}
          className="video-player"
          controls
          playsInline
          preload="metadata"
          aria-label="在线视频播放器"
          hidden={Boolean(isEmbedded)}
        />

        {!source && (
          <div className="video-empty-state">
            <MonitorPlay size={36} strokeWidth={1.6} aria-hidden="true" />
            <strong>把视频地址放进来</strong>
            <p>支持 MP4、WebM、HLS 流和常见视频网站链接。</p>
          </div>
        )}
      </div>

      <div className="video-source-meta">
        {source ? (
          <>
            <span className="video-source-badge">
              <Radio size={14} strokeWidth={2} aria-hidden="true" />
              {displayVideoKind(source.kind)}
            </span>
            <span>{sourceHost}</span>
            <a href={source.originalUrl} target="_blank" rel="noreferrer">
              原始链接
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </>
        ) : (
          <span>播放器会在本机直接访问视频地址，不经过 Bocchi 服务器。</span>
        )}
      </div>

      <div className="tool-feedback" aria-live="polite">
        {error ? (
          <p className="tool-feedback--error">
            <CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />
            {error}
          </p>
        ) : status ? (
          <p className="tool-feedback--success">
            <Check size={16} strokeWidth={2.2} aria-hidden="true" />
            {status}
          </p>
        ) : (
          <p>跨域或防盗链视频可能无法直接播放，请优先使用允许外链的地址。</p>
        )}
      </div>
    </section>
  );
}


