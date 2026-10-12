import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { Check, CircleAlert, Download, ImagePlus, Trash2 } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { calculateWatermarkPosition, type WatermarkPosition } from "./watermarkUtils";
type WatermarkItem = { id: string; name: string; image: HTMLImageElement };
const positions: Array<{ value: WatermarkPosition; label: string }> = [{ value: "top-left", label: "\u5de6\u4e0a" }, { value: "top-right", label: "\u53f3\u4e0a" }, { value: "center", label: "\u5c45\u4e2d" }, { value: "bottom-left", label: "\u5de6\u4e0b" }, { value: "bottom-right", label: "\u53f3\u4e0b" }];
function createId() { return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readImage(file: File): Promise<WatermarkItem> { return new Promise((resolve, reject) => { const url = URL.createObjectURL(file); const image = new Image(); image.onload = () => { URL.revokeObjectURL(url); resolve({ id: createId(), name: file.name, image }); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`\u65e0\u6cd5\u8bfb\u53d6 ${file.name}`)); }; image.src = url; }); }
function downloadBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); }
export function WatermarkTool() {
  const [items, setItems] = useState<WatermarkItem[]>([]); const [activeId, setActiveId] = useState(""); const [text, setText] = useState("Bocchi"); const [position, setPosition] = useState<WatermarkPosition>("bottom-right"); const [opacity, setOpacity] = useState(0.65); const [fontSize, setFontSize] = useState(42); const [color, setColor] = useState("#ffffff"); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [error, setError] = useState(""); const canvasRef = useRef<HTMLCanvasElement>(null); const activeItem = items.find((item) => item.id === activeId) ?? null;
  function draw(canvas: HTMLCanvasElement, image: HTMLImageElement) { canvas.width = image.naturalWidth || image.width; canvas.height = image.naturalHeight || image.height; const context = canvas.getContext("2d"); if (!context) return; context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); context.font = `700 ${fontSize}px "Microsoft YaHei", sans-serif`; const label = text || "Bocchi"; const metrics = context.measureText(label); const point = calculateWatermarkPosition({ width: canvas.width, height: canvas.height }, { width: metrics.width, height: fontSize }, position, 24); context.globalAlpha = opacity; context.fillStyle = "rgba(0,0,0,0.36)"; context.fillRect(point.x - 8, point.y - 4, metrics.width + 16, fontSize + 12); context.fillStyle = color; context.textBaseline = "top"; context.fillText(label, point.x, point.y); context.globalAlpha = 1; }
  useEffect(() => { const canvas = canvasRef.current; if (canvas && activeItem) draw(canvas, activeItem.image); }, [activeItem, color, fontSize, opacity, position, text]);  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      const images = await Promise.all([...files].filter((file) => file.type.startsWith("image/")).map(readImage));
      if (!images.length) throw new Error("\u8bf7\u9009\u62e9\u56fe\u7247\u6587\u4ef6\u3002");
      setItems((current) => [...current, ...images]);
      setActiveId((current) => current || images[0].id);
      setNotice(`\u5df2\u6dfb\u52a0 ${images.length} \u5f20\u56fe\u7247\u3002`);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "\u56fe\u7247\u8bfb\u53d6\u5931\u8d25\u3002");
    }
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setActiveId((current) => (current === id ? "" : current));
  }

  function renderBlob(image: HTMLImageElement) {
    const canvas = document.createElement("canvas");
    draw(canvas, image);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  function downloadCurrent() {
    const canvas = canvasRef.current;
    if (!canvas || !activeItem) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `watermarked-${activeItem.name.replace(/\.[^.]+$/, "")}.png`);
      void reportToolUsage("watermark");
    }, "image/png");
  }

  async function downloadAll() {
    if (!items.length) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      for (const item of items) {
        const blob = await renderBlob(item.image);
        if (blob) zip.file(`watermarked-${item.name.replace(/\.[^.]+$/, "")}.png`, blob);
      }
      const bundle = await zip.generateAsync({ type: "blob" });
      downloadBlob(bundle, "bocchi-watermarked.zip");
      setNotice(`\u5df2\u6253\u5305 ${items.length} \u5f20\u56fe\u7247\u3002`);
      void reportToolUsage("watermark");
    } catch {
      setError("\u6279\u91cf\u5904\u7406\u5931\u8d25\u3002");
    } finally {
      setBusy(false);
    }
  }  return (
    <section className="watermark-tool" aria-labelledby="watermark-tool-title">
      <header className="tool-heading"><div className="tool-heading__icon"><ImagePlus size={25} /></div><div><h1 id="watermark-tool-title">{"\u56fe\u7247\u6c34\u5370"}</h1><p>{"\u6279\u91cf\u6dfb\u52a0\u6587\u5b57\u6c34\u5370\u3002"}</p></div></header>
      <div className="watermark-workbench">
        <section className="watermark-preview">
          <canvas ref={canvasRef} className={activeItem ? "" : "is-empty"} />
          {!activeItem && <label className="watermark-upload" htmlFor="watermark-file-initial"><ImagePlus size={24} /><strong>{"\u9009\u62e9\u4e00\u5f20\u6216\u591a\u5f20\u56fe\u7247"}</strong><span>{"\u56fe\u7247\u53ea\u5728\u672c\u5730\u5904\u7406"}</span><input id="watermark-file-initial" className="visually-hidden" type="file" accept="image/*" multiple onChange={(event) => { void handleFiles(event.target.files); event.target.value = ""; }} /></label>}
        </section>
        <section className="watermark-controls">
          <label><span>{"\u6c34\u5370\u6587\u5b57"}</span><input value={text} onChange={(event) => setText(event.target.value)} /></label>
          <label><span>{"\u4f4d\u7f6e"}</span><select value={position} onChange={(event) => setPosition(event.target.value as WatermarkPosition)}>{positions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span>{"\u5b57\u53f7"}: {fontSize}px</span><input type="range" min="16" max="120" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label>
          <label><span>{"\u900f\u660e\u5ea6"}: {Math.round(opacity * 100)}%</span><input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></label>
          <label><span>{"\u989c\u8272"}</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
          <label className="watermark-add" htmlFor="watermark-file-add"><ImagePlus size={16} />{"\u7ee7\u7eed\u6dfb\u52a0\u56fe\u7247"}<input id="watermark-file-add" className="visually-hidden" type="file" accept="image/*" multiple onChange={(event) => { void handleFiles(event.target.files); event.target.value = ""; }} /></label>
          <div className="watermark-actions"><button className="tool-button tool-button--primary" type="button" onClick={downloadCurrent} disabled={!activeItem}><Download size={16} />{"\u4e0b\u8f7d\u5f53\u524d"}</button><button className="tool-button" type="button" onClick={() => void downloadAll()} disabled={!items.length || busy}><Download size={16} />{busy ? "\u6b63\u5728\u6253\u5305\u2026" : "\u6279\u91cf\u4e0b\u8f7d ZIP"}</button></div>
        </section>
      </div>
      {items.length > 0 && <section className="watermark-batch"><header><span>{"\u6279\u91cf\u5217\u8868"}</span><small>{items.length} {"\u5f20\u56fe\u7247"}</small></header><div>{items.map((item) => <button className={item.id === activeId ? "is-active" : ""} key={item.id} type="button" onClick={() => setActiveId(item.id)}><span>{item.name}</span><Trash2 size={14} onClick={(event) => { event.stopPropagation(); removeItem(item.id); }} /></button>)}</div></section>}
      <div className="tool-feedback">{error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>{"\u9009\u62e9\u56fe\u7247\u540e\u4f1a\u81ea\u52a8\u9884\u89c8\u3002"}</p>}</div>
    </section>
  );
}