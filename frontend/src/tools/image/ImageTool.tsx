import { reportToolUsage } from "../../services/toolUsage";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  FlipHorizontal2,
  Image as ImageIcon,
  Lock,
  LockOpen,
  RotateCcw,
  RotateCw,
  Upload,
} from "lucide-react";

type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

const formatOptions: Array<{ value: OutputFormat; label: string; extension: string }> = [
  { value: "image/png", label: "PNG", extension: "png" },
  { value: "image/jpeg", label: "JPG", extension: "jpg" },
  { value: "image/webp", label: "WebP", extension: "webp" },
];

function formatBytes(value: number) {
  if (!value) return "尚未生成";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export function ImageTool() {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [keepRatio, setKeepRatio] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [format, setFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(0.9);
  const [outputSize, setOutputSize] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;

    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, nextWidth, nextHeight);
    if (format === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, nextWidth, nextHeight);
    }

    context.save();
    context.translate(nextWidth / 2, nextHeight / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.scale(flipX ? -1 : 1, 1);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const drawWidth = rotation % 180 === 0 ? nextWidth : nextHeight;
    const drawHeight = rotation % 180 === 0 ? nextHeight : nextWidth;
    context.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();

    const timer = window.setTimeout(() => {
      canvas.toBlob(
        (blob) => setOutputSize(blob?.size ?? 0),
        format,
        format === "image/png" ? undefined : quality,
      );
    }, 120);
    return () => window.clearTimeout(timer);
  }, [flipX, format, height, quality, rotation, source, width]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件。");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setSource(image);
      setFileName(file.name);
      setWidth(image.naturalWidth);
      setHeight(image.naturalHeight);
      setRotation(0);
      setFlipX(false);
      setFormat("image/png");
      setQuality(0.9);
      setNotice("图片已载入，可以调整尺寸或格式。");
      setError("");
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError("图片读取失败，请尝试其他文件。");
    };
    image.src = objectUrl;
  }

  function updateWidth(value: number) {
    const nextWidth = Math.max(1, Math.min(12000, Math.round(value || 1)));
    setWidth(nextWidth);
    if (!keepRatio || !source) return;
    const aspect = rotation % 180 === 0
      ? source.naturalWidth / source.naturalHeight
      : source.naturalHeight / source.naturalWidth;
    setHeight(Math.max(1, Math.round(nextWidth / aspect)));
  }

  function updateHeight(value: number) {
    const nextHeight = Math.max(1, Math.min(12000, Math.round(value || 1)));
    setHeight(nextHeight);
    if (!keepRatio || !source) return;
    const aspect = rotation % 180 === 0
      ? source.naturalWidth / source.naturalHeight
      : source.naturalHeight / source.naturalWidth;
    setWidth(Math.max(1, Math.round(nextHeight * aspect)));
  }

  function rotateImage() {
    setWidth(height);
    setHeight(width);
    setRotation((current) => (current + 90) % 360);
  }

  function resetImage() {
    if (!source) return;
    setWidth(source.naturalWidth);
    setHeight(source.naturalHeight);
    setRotation(0);
    setFlipX(false);
    setFormat("image/png");
    setQuality(0.9);
    setNotice("已恢复原图参数。");
    setError("");
  }

  function downloadImage() {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    const option = formatOptions.find((item) => item.value === format) ?? formatOptions[0];
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("图片导出失败，请重试。");
          return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const baseName = fileName.replace(/\.[^.]+$/, "") || "bocchi-image";
        anchor.href = url;
        anchor.download = `${baseName}-bocchi.${option.extension}`;
        anchor.click();
        void reportToolUsage("image");
        URL.revokeObjectURL(url);
        setNotice("图片已下载。");
        setError("");
      },
      format,
      format === "image/png" ? undefined : quality,
    );
  }

  return (
    <section className="image-tool" aria-labelledby="image-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <ImageIcon size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="image-tool-title">图像处理</h1>
          <p>调整尺寸、旋转、翻转并转换为常用图片格式。</p>
        </div>
      </header>

      <div className={`image-workbench${source ? " has-image" : ""}`}>
        {!source ? (
          <label className="image-dropzone" htmlFor="image-process-input">
            <Upload size={30} strokeWidth={1.7} aria-hidden="true" />
            <strong>选择一张图片开始</strong>
            <span>支持 PNG、JPG、WebP 等浏览器可读取格式</span>
            <input
              id="image-process-input"
              className="visually-hidden"
              type="file"
              accept="image/*"
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        ) : (
          <>
            <section className="image-preview-panel">
              <div className="image-preview-stage">
                <canvas ref={canvasRef} aria-label="处理后的图片预览" />
              </div>
              <div className="image-preview-meta">
                <span>{fileName}</span>
                <span>{width} × {height}</span>
                <span>{formatBytes(outputSize)}</span>
              </div>
            </section>

            <section className="image-controls">
              <div className="image-control-group">
                <div className="image-control-heading">
                  <span>输出尺寸</span>
                  <button
                    className={keepRatio ? "is-active" : ""}
                    type="button"
                    onClick={() => setKeepRatio((current) => !current)}
                  >
                    {keepRatio ? <Lock size={15} /> : <LockOpen size={15} />}
                    锁定比例
                  </button>
                </div>
                <div className="image-size-fields">
                  <label>
                    <span>宽度</span>
                    <input type="number" min="1" max="12000" value={width} onChange={(event) => updateWidth(Number(event.target.value))} />
                  </label>
                  <span aria-hidden="true">×</span>
                  <label>
                    <span>高度</span>
                    <input type="number" min="1" max="12000" value={height} onChange={(event) => updateHeight(Number(event.target.value))} />
                  </label>
                </div>
              </div>

              <div className="image-control-group">
                <span className="image-control-label">方向</span>
                <div className="image-button-row">
                  <button className="tool-button" type="button" onClick={rotateImage}>
                    <RotateCw size={17} strokeWidth={2} aria-hidden="true" />
                    旋转 90°
                  </button>
                  <button className="tool-button" type="button" onClick={() => setFlipX((current) => !current)}>
                    <FlipHorizontal2 size={17} strokeWidth={2} aria-hidden="true" />
                    水平翻转
                  </button>
                  <button className="tool-button" type="button" onClick={resetImage}>
                    <RotateCcw size={17} strokeWidth={2} aria-hidden="true" />
                    恢复原图
                  </button>
                </div>
              </div>

              <div className="image-control-group">
                <span className="image-control-label">输出格式</span>
                <div className="image-format-options">
                  {formatOptions.map((option) => (
                    <label className={format === option.value ? "is-active" : ""} key={option.value}>
                      <input
                        type="radio"
                        name="image-output-format"
                        value={option.value}
                        checked={format === option.value}
                        onChange={() => setFormat(option.value)}
                      />
                      <strong>{option.label}</strong>
                      <small>{option.value === "image/png" ? "无损" : "可调质量"}</small>
                    </label>
                  ))}
                </div>
                {format !== "image/png" && (
                  <label className="image-quality">
                    <span>质量：{Math.round(quality * 100)}%</span>
                    <input
                      type="range"
                      min="0.3"
                      max="1"
                      step="0.05"
                      value={quality}
                      onChange={(event) => setQuality(Number(event.target.value))}
                    />
                  </label>
                )}
              </div>

              <div className="image-actions">
                <button className="tool-button tool-button--primary" type="button" onClick={downloadImage}>
                  <Download size={17} strokeWidth={2} aria-hidden="true" />
                  下载图片
                </button>
                <label className="tool-button image-replace-button" htmlFor="image-process-input">
                  <Upload size={17} strokeWidth={2} aria-hidden="true" />
                  更换图片
                </label>
                <input
                  id="image-process-input"
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    handleFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
            </section>
          </>
        )}
      </div>

      <div className="tool-feedback" aria-live="polite">
        {error ? (
          <p className="tool-feedback--error">{error}</p>
        ) : notice ? (
          <p className="tool-feedback--success">
            <Check size={16} strokeWidth={2.2} aria-hidden="true" />
            {notice}
          </p>
        ) : (
          <p>图片只在浏览器本地处理，不会上传到服务器。</p>
        )}
      </div>
    </section>
  );
}

