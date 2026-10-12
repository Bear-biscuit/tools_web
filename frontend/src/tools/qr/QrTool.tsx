import { reportToolUsage } from "../../services/toolUsage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  QrCode,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode";

type CorrectionLevel = "L" | "M" | "Q" | "H";

const sampleText = "https://github.com/vastsa/FileCodeBox";

export function QrTool() {
  const [text, setText] = useState(sampleText);
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [level, setLevel] = useState<CorrectionLevel>("M");
  const [dark, setDark] = useState("#10203a");
  const [light, setLight] = useState("#ffffff");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textBytes = useMemo(() => new TextEncoder().encode(text).length, [text]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!text.trim()) {
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      setError("请输入要生成二维码的内容。");
      return;
    }

    let active = true;
    QRCode.toCanvas(canvas, text, {
      width: size,
      margin,
      errorCorrectionLevel: level,
      color: { dark, light },
    })
      .then(() => {
        if (!active) return;
        setError("");
        setNotice("");
      })
      .catch(() => {
        if (!active) return;
        setError("二维码生成失败，请缩短内容或调整参数。");
        setNotice("");
      });

    return () => {
      active = false;
    };
  }, [dark, level, light, margin, size, text]);

  async function copyText() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setNotice("二维码内容已复制。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  function downloadQrCode() {
    const canvas = canvasRef.current;
    if (!canvas || !text.trim()) return;

    canvas.toBlob((blob) => {
      if (!blob) {
        setError("二维码导出失败，请重试。");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "bocchi-qrcode.png";
      anchor.click();
      void reportToolUsage("qr");
      URL.revokeObjectURL(url);
      setNotice("二维码已下载。");
    }, "image/png");
  }

  function loadSample() {
    setText(sampleText);
    setSize(320);
    setMargin(2);
    setLevel("M");
    setDark("#10203a");
    setLight("#ffffff");
    setNotice("示例已载入。");
    setError("");
  }

  return (
    <section className="qr-tool" aria-labelledby="qr-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <QrCode size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="qr-tool-title">二维码</h1>
          <p>把链接、文本或短信息生成可下载的二维码。</p>
        </div>
      </header>

      <div className="qr-workbench">
        <section className="qr-editor">
          <label className="tool-field">
            <span>二维码内容</span>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setNotice("");
                setError("");
              }}
              placeholder="输入网址、文本或联系方式"
              spellCheck={false}
            />
          </label>

          <div className="qr-options-grid">
            <label className="tool-field">
              <span>尺寸：{size}px</span>
              <input
                type="range"
                min="180"
                max="640"
                step="20"
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
              />
            </label>

            <label className="tool-field">
              <span>留白：{margin} 格</span>
              <input
                type="range"
                min="0"
                max="8"
                value={margin}
                onChange={(event) => setMargin(Number(event.target.value))}
              />
            </label>

            <label className="tool-field">
              <span>纠错等级</span>
              <select value={level} onChange={(event) => setLevel(event.target.value as CorrectionLevel)}>
                <option value="L">L · 约 7%</option>
                <option value="M">M · 约 15%</option>
                <option value="Q">Q · 约 25%</option>
                <option value="H">H · 约 30%</option>
              </select>
            </label>

            <div className="qr-color-fields">
              <label>
                <span>前景</span>
                <input type="color" value={dark} onChange={(event) => setDark(event.target.value)} />
              </label>
              <label>
                <span>背景</span>
                <input type="color" value={light} onChange={(event) => setLight(event.target.value)} />
              </label>
            </div>
          </div>

          <div className="qr-actions">
            <button className="tool-button tool-button--primary" type="button" onClick={downloadQrCode}>
              <Download size={17} strokeWidth={2} aria-hidden="true" />
              下载 PNG
            </button>
            <button className="tool-button" type="button" onClick={copyText}>
              <Clipboard size={17} strokeWidth={2} aria-hidden="true" />
              复制内容
            </button>
            <button className="tool-button" type="button" onClick={loadSample}>
              <Sparkles size={17} strokeWidth={2} aria-hidden="true" />
              示例
            </button>
          </div>
        </section>

        <section className="qr-preview" aria-label="二维码预览">
          <div className="qr-canvas-frame">
            <canvas ref={canvasRef} aria-label="生成的二维码" />
          </div>
          <div className="qr-preview__meta">
            <span>{textBytes} 字节</span>
            <span>{text.length} 字符</span>
            <span>PNG 导出</span>
          </div>
          <div className="qr-feedback" aria-live="polite">
            {error ? (
              <p className="tool-feedback tool-feedback--error">{error}</p>
            ) : notice ? (
              <p className="tool-feedback tool-feedback--success">
                <Check size={16} strokeWidth={2.2} aria-hidden="true" />
                {notice}
              </p>
            ) : (
              <p className="tool-feedback">
                <RefreshCw size={15} strokeWidth={2} aria-hidden="true" />
                内容变化后二维码会即时更新。
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
