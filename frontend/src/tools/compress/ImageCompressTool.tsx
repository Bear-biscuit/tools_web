import { useRef, useState } from "react";
import { Check, CircleAlert, Download, ImageDown, Upload } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";

type SourceImage = {
  file: File;
  url: string;
  width: number;
  height: number;
  size: number;
};

type OutputImage = {
  blob: Blob;
  url: string;
  size: number;
};

const FORMATS = [
  { value: "image/webp", label: "WebP" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
];

export function ImageCompressTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [output, setOutput] = useState<OutputImage | null>(null);
  const [scale, setScale] = useState(80);
  const [quality, setQuality] = useState(78);
  const [format, setFormat] = useState("image/webp");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("图片加载失败。"));
      image.src = url;
    });
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setNotice("");
    setError("");
    setOutput(null);
    try {
      const url = URL.createObjectURL(file);
      const image = await loadImage(url);
      setSource({ file, url, width: image.naturalWidth, height: image.naturalHeight, size: file.size });
    } catch {
      setError("无法读取这张图片。");
    }
  }

  async function compress() {
    if (!source) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const image = await loadImage(source.url);
      const width = Math.max(1, Math.round((source.width * scale) / 100));
      const height = Math.max(1, Math.round((source.height * scale) / 100));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前浏览器不支持画布处理。");
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, quality / 100));
      if (!blob) throw new Error("图片编码失败。");
      setOutput({ blob, url: URL.createObjectURL(blob), size: blob.size });
      setNotice("压缩完成");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "压缩失败。");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!output) return;
    const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
    const anchor = document.createElement("a");
    anchor.href = output.url;
    anchor.download = `bocchi-compressed.${ext}`;
    anchor.click();
    setNotice("图片已开始下载");
    void reportToolUsage("compress");
  }

  function formatSize(bytes: number) {
    if (!bytes) return "0 KB";
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  const savingPercent = source && output ? Math.max(0, Math.round((1 - output.size / source.size) * 100)) : 0;

  return (
    <section className="compress-tool" aria-labelledby="compress-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><ImageDown size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="compress-tool-title">图片压缩</h1><p>在浏览器本地缩放并压缩图片，不会上传到服务器。</p></div>
      </header>

      <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }} />

      <div className="compress-workbench">
        <section className="compress-controls">
          <label>
            <span>缩放比例</span>
            <input type="range" min="10" max="100" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
            <small>{scale}%</small>
          </label>
          <label>
            <span>图片质量</span>
            <input type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
            <small>{quality}%</small>
          </label>
          <label>
            <span>输出格式</span>
            <select value={format} onChange={(event) => setFormat(event.target.value)}>
              {FORMATS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <button className="tool-button" type="button" onClick={() => fileRef.current?.click()}><Upload size={16} />{source ? "重新选择图片" : "选择图片"}</button>
          <button className="tool-button tool-button--primary" type="button" onClick={() => void compress()} disabled={!source || busy}><ImageDown size={16} />{busy ? "处理中…" : "开始压缩"}</button>
          <button className="tool-button" type="button" onClick={download} disabled={!output}><Download size={16} />下载图片</button>
        </section>

        <section className="compress-preview">
          <div className="compress-image-wrap">
            {output ? <img src={output.url} alt="压缩结果预览" /> : source ? <img src={source.url} alt="原始图片预览" /> : <div className="compress-empty">选择图片后在这里预览。</div>}
          </div>
          <div className="compress-meta">
            <span>原始 {source ? `${source.width} × ${source.height} · ${formatSize(source.size)}` : "—"}</span>
            <span>输出 {output ? `${formatSize(output.size)} · 节省 ${savingPercent}%` : "—"}</span>
          </div>
        </section>
      </div>

      <div className="tool-feedback" aria-live="polite">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>PNG、JPEG、WebP 都可在当前浏览器中处理。</p>}
      </div>
    </section>
  );
}