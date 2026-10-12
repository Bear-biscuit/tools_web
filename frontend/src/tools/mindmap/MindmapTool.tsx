import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Download, Network, Sparkles } from "lucide-react";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import type { AuthSession } from "../../services/auth";
import { ToolRecords, type ToolRecord } from "../../components/ToolRecords";
import { ToolShare } from "../../components/ToolShare";
import { reportToolUsage } from "../../services/toolUsage";

const SAMPLE = `# Bocchi 工具箱

## 开发工具
- JSON 格式化
- 时间戳转换
- Base64 编解码

## 图像工具
- 图片压缩
- 图片水印
- 二维码生成

## 效率工具
- 计时器
- Cron 表达式
- 文件快递柜`;

type MindmapToolProps = {
  session: AuthSession | null;
};

export function MindmapTool({ session }: MindmapToolProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 });
  const [source, setSource] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventWheelScroll = (event: WheelEvent) => event.preventDefault();
    canvas.addEventListener("wheel", preventWheelScroll, { passive: false });
    return () => canvas.removeEventListener("wheel", preventWheelScroll);
  }, []);

  async function renderMindmap(contentValue: string = source) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const transformer = new Transformer();
      const { root } = transformer.transform(contentValue);
      if (!svgRef.current) throw new Error("导图容器尚未准备好。");
      svgRef.current.replaceChildren();
      const markmap = Markmap.create(svgRef.current, {
        duration: 350,
        pan: true,
        zoom: true,
        scrollForPan: false,
      });
      markmap.setData(root);
      await markmap.fit();
      setNotice("思维导图已生成");
      void reportToolUsage("mindmap");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Markdown 解析失败");
    } finally {
      setBusy(false);
    }
  }

  function openRecord(record: ToolRecord) {
    setSource(record.content);
    setNotice("已打开记录");
    setError("");
    void renderMindmap(record.content);
  }

  function downloadSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const source = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bocchi-mindmap.svg";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("SVG 已开始下载");
    void reportToolUsage("mindmap");
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    dragRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      left: canvas.scrollLeft,
      top: canvas.scrollTop,
    };
    canvas.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag.active || !canvas) return;
    canvas.scrollLeft = drag.left - (event.clientX - drag.x);
    canvas.scrollTop = drag.top - (event.clientY - drag.y);
  }

  function stopDrag(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current.active = false;
    canvasRef.current?.releasePointerCapture(event.pointerId);
  }

  return (
    <section className="mindmap-tool" aria-labelledby="mindmap-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><Network size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="mindmap-tool-title">思维导图</h1><p>用 Markdown 列表生成可交互思维导图，支持鼠标拖动和滚轮缩放。</p></div>
      </header>

      <div className="mindmap-workbench">
        <label className="mindmap-source">
          <span>Markdown 大纲</span>
          <textarea value={source} onChange={(event) => { setSource(event.target.value); setNotice(""); setError(""); }} spellCheck={false} />
        </label>
        <section className="mindmap-preview">
          <header><span>导图预览</span><small>拖动空白处移动画布，滚轮缩放</small></header>
          <div
            ref={canvasRef}
            className="mindmap-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            <svg ref={svgRef} />
          </div>
        </section>
      </div>

      <div className="mindmap-actions">
        <button className="tool-button" type="button" onClick={() => setSource(SAMPLE)}><Sparkles size={15} />加载示例</button>
        <button className="tool-button tool-button--primary" type="button" onClick={() => void renderMindmap()} disabled={busy || !source.trim()}><Network size={15} />{busy ? "生成中…" : "生成导图"}</button>
        <button className="tool-button" type="button" onClick={downloadSvg}><Download size={15} />下载 SVG</button>
      </div>

      <ToolRecords
        recordKey="mindmap.records"
        session={session}
        content={source}
        defaultName="思维导图"
        onOpen={openRecord}
      />

      <ToolShare
        kind="mindmap"
        session={session}
        getContent={() => source}
        defaultTitle="思维导图"
      />

      <div className="tool-feedback" aria-live="polite">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>缩进列表会自动转换为父子节点。</p>}
      </div>
    </section>
  );
}