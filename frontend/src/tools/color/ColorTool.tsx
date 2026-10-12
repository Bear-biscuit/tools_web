import { reportToolUsage } from "../../services/toolUsage";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  Clipboard,
  ImagePlus,
  Palette,
  Save,
  Trash2,
} from "lucide-react";
import { getPreference, savePreference } from "../../services/account";
import type { AuthSession } from "../../services/auth";
import {
  createPalette,
  extractDominantColors,
  getContrastRatio,
  hexToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
} from "./colorUtils";

type ColorToolProps = {
  session: AuthSession | null;
};

type SavedColor = {
  id: string;
  color: string;
  palette: Array<{ label: string; hex: string }>;
  savedAt: string;
};

const SAVED_COLORS_KEY = "color.saved";
const MAX_SAVED_COLORS = 12;

function createSavedId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ColorTool({ session }: ColorToolProps) {
  const [color, setColor] = useState("#2e5bff");
  const [hexInput, setHexInput] = useState("#2e5bff");
  const [notice, setNotice] = useState("");
  const [savedColors, setSavedColors] = useState<SavedColor[]>([]);
  const [imageName, setImageName] = useState("");
  const [imagePalette, setImagePalette] = useState<string[]>([]);
  const [mobileSection, setMobileSection] = useState<"picker" | "image" | "saved">("picker");
  const [samplePoint, setSamplePoint] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rgb = useMemo(() => hexToRgb(color), [color]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const palette = useMemo(() => createPalette(color), [color]);
  const contrastOnWhite = useMemo(
    () => getContrastRatio(rgb, { r: 255, g: 255, b: 255 }),
    [rgb],
  );
  const contrastOnBlack = useMemo(
    () => getContrastRatio(rgb, { r: 0, g: 0, b: 0 }),
    [rgb],
  );

  useEffect(() => {
    let active = true;

    getPreference<SavedColor[]>(SAVED_COLORS_KEY, session)
      .then((value) => {
        if (active) setSavedColors(Array.isArray(value) ? value : []);
      })
      .catch(() => {
        if (active) setSavedColors([]);
      });

    return () => {
      active = false;
    };
  }, [session]);

  function applyColor(nextColor: string, countUsage = false) {
    const normalized = normalizeHex(nextColor);
    if (!normalized) return;

    setColor(normalized);
    setHexInput(normalized);
    setSamplePoint(null);
    setNotice("");
    if (countUsage) void reportToolUsage("color");
  }

  function handleHexSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeHex(hexInput);

    if (!normalized) {
      setNotice("请输入 3 位或 6 位十六进制颜色。");
      return;
    }

    applyColor(normalized, true);
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`已复制 ${value}`);
    } catch {
      setNotice("浏览器没有允许访问剪贴板。");
    }
  }

  async function saveColor() {
    const nextColor: SavedColor = {
      id: createSavedId(),
      color,
      palette,
      savedAt: new Date().toISOString(),
    };
    const next = [
      nextColor,
      ...savedColors.filter((item) => item.color !== color),
    ].slice(0, MAX_SAVED_COLORS);

    await savePreference(SAVED_COLORS_KEY, next, session);
    setSavedColors(next);
    void reportToolUsage("color");
    setNotice(session ? "配色已保存到账户。" : "配色已保存到本机。");
  }

  async function removeSavedColor(id: string) {
    const next = savedColors.filter((item) => item.id !== id);
    await savePreference(SAVED_COLORS_KEY, next, session);
    setSavedColors(next);
    setNotice("已移除保存的配色。");
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice("请选择图片文件。");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      const maxSize = 900;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = extractDominantColors(pixels, 5);
      setImagePalette(colors);
      setImageName(file.name);
      setSamplePoint(null);
      setNotice(`已从图片提取 ${colors.length} 个主色。`);
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setNotice("图片读取失败，请尝试其他文件。");
    };

    image.src = objectUrl;
  }

  function pickColorFromCanvas(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.min(canvas.width - 1, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * canvas.width)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.round(((event.clientY - rect.top) / rect.height) * canvas.height)));
    const pixel = context.getImageData(x, y, 1, 1).data;
    const picked = rgbToHex({ r: pixel[0], g: pixel[1], b: pixel[2] });

    setSamplePoint({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
    setColor(picked);
    setHexInput(picked);
    void reportToolUsage("color");
    setNotice(`已从图片取色：${picked}`);
  }
  return (
    <section className="color-tool" data-mobile-section={mobileSection} aria-labelledby="color-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <Palette size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="color-tool-title">颜色工具</h1>
          <p>选择颜色、提取图片主色，并保存常用配色。</p>
        </div>
      </header>

      <div className="mobile-tool-tabs color-mobile-tabs" aria-label="颜色工具区域">
        <button className={mobileSection === "picker" ? "is-active" : ""} type="button" onClick={() => setMobileSection("picker")}>颜色</button>
        <button className={mobileSection === "image" ? "is-active" : ""} type="button" onClick={() => setMobileSection("image")}>图片取色</button>
        <button className={mobileSection === "saved" ? "is-active" : ""} type="button" onClick={() => setMobileSection("saved")}>已保存</button>
      </div>

      <div className="color-workbench">
        <section className="color-picker-panel">
          <label className="color-preview" style={{ backgroundColor: color }}>
            <input
              type="color"
              value={color}
              onChange={(event) => applyColor(event.target.value)}
              aria-label="选择颜色"
            />
            <span>点击这里使用系统取色器</span>
          </label>

          <form className="color-input-form" onSubmit={handleHexSubmit}>
            <label htmlFor="hex-color">手动输入 HEX 颜色</label>
            <div>
              <input
                id="hex-color"
                value={hexInput}
                onChange={(event) => setHexInput(event.target.value)}
                placeholder="#2e5bff"
                spellCheck={false}
              />
              <button type="submit">使用此颜色</button>
            </div>
            <small>支持 3 位或 6 位十六进制值，例如 #0af 或 #2e5bff。</small>
          </form>
        </section>

        <section className="color-values-panel">
          <div className="color-value-row">
            <span>HEX</span>
            <code>{color}</code>
            <button type="button" onClick={() => copyValue(color)} aria-label="复制 HEX">
              <Clipboard size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="color-value-row">
            <span>RGB</span>
            <code>{rgb.r}, {rgb.g}, {rgb.b}</code>
            <button
              type="button"
              onClick={() => copyValue(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)}
              aria-label="复制 RGB"
            >
              <Clipboard size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="color-value-row">
            <span>HSL</span>
            <code>{hsl.h}°, {hsl.s}%, {hsl.l}%</code>
            <button type="button" onClick={() => copyValue(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)} aria-label="复制 HSL">
              <Clipboard size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="contrast-grid">
            <div>
              <span>白色对比度</span>
              <strong>{contrastOnWhite.toFixed(2)}:1</strong>
              <small>{contrastOnWhite >= 4.5 ? "通过正文标准" : "仅适合大号文字"}</small>
            </div>
            <div>
              <span>黑色对比度</span>
              <strong>{contrastOnBlack.toFixed(2)}:1</strong>
              <small>{contrastOnBlack >= 4.5 ? "通过正文标准" : "仅适合大号文字"}</small>
            </div>
          </div>
        </section>
      </div>

      <section className="palette-panel" aria-label="生成配色">
        <header>
          <span>当前颜色配色</span>
          <button type="button" onClick={saveColor}>
            <Save size={16} strokeWidth={2} aria-hidden="true" />
            {session ? "保存到账户" : "保存到本机"}
          </button>
        </header>
        <div className="palette-grid">
          {palette.map((item) => (
            <button
              key={`${item.label}-${item.hex}`}
              type="button"
              style={{ backgroundColor: item.hex }}
              onClick={() => applyColor(item.hex, true)}
              aria-label={`使用 ${item.label} ${item.hex}`}
            >
              <span>{item.label}</span>
              <code>{item.hex}</code>
            </button>
          ))}
        </div>
      </section>

      <section className="saved-colors-panel" aria-label="已保存的颜色">
        <header>
          <span>已保存的颜色</span>
          <small>{savedColors.length} / {MAX_SAVED_COLORS}</small>
        </header>

        {savedColors.length ? (
          <div className="saved-colors-grid">
            {savedColors.map((item) => (
              <article className="saved-color-card" key={item.id}>
                <button
                  className="saved-color-main"
                  type="button"
                  onClick={() => applyColor(item.color, true)}
                  aria-label={`使用保存的颜色 ${item.color}`}
                >
                  <span className="saved-color-swatch" style={{ backgroundColor: item.color }} />
                  <span>
                    <strong>{item.color}</strong>
                    <small>{new Date(item.savedAt).toLocaleDateString()}</small>
                  </span>
                </button>
                <div className="saved-color-palette" aria-hidden="true">
                  {item.palette.map((colorItem) => (
                    <span
                      key={`${item.id}-${colorItem.label}-${colorItem.hex}`}
                      style={{ backgroundColor: colorItem.hex }}
                    />
                  ))}
                </div>
                <button
                  className="saved-color-delete"
                  type="button"
                  onClick={() => removeSavedColor(item.id)}
                  aria-label={`删除 ${item.color}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="saved-colors-empty">保存的配色会出现在这里，之后可以一键重新使用。</p>
        )}
      </section>

      <section className="image-color-panel" aria-label="从图片取色">
        <header>
          <div>
            <span>从图片取色</span>
            <small>上传图片后，点击图片上的任意位置取色。</small>
          </div>
          <label className="image-upload-button" htmlFor="image-color-input">
            <ImagePlus size={16} strokeWidth={2} aria-hidden="true" />
            选择图片
          </label>
          <input
            id="image-color-input"
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
        </header>

        <div className={`image-picker-stage${imageName ? " has-image" : ""}`}>
          <div className="image-canvas-wrap">
            <canvas
              ref={canvasRef}
              className={imageName ? "" : "is-empty"}
              onClick={pickColorFromCanvas}
              aria-label="点击图片拾取颜色"
            />
            {samplePoint && (
              <span
                className="image-sample-point"
                style={{ left: `${samplePoint.x}%`, top: `${samplePoint.y}%` }}
                aria-hidden="true"
              />
            )}
          </div>
          {!imageName && (
            <label htmlFor="image-color-input">
              <ImagePlus size={28} strokeWidth={1.7} aria-hidden="true" />
              <strong>选择一张图片</strong>
              <span>支持 JPG、PNG、WebP 等浏览器可读取格式</span>
            </label>
          )}
        </div>

        {imageName && (
          <div className="image-color-result">
            <span>{imageName}</span>
            <div>
              {imagePalette.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  style={{ backgroundColor: hex }}
                  onClick={() => applyColor(hex)}
                  aria-label={`使用图片主色 ${hex}`}
                >
                  <code>{hex}</code>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="color-feedback" aria-live="polite">
        {notice && (
          <p>
            <Check size={16} strokeWidth={2.2} aria-hidden="true" />
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}