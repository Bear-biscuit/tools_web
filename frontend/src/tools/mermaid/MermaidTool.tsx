import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Clipboard, Download, Sparkles, Workflow } from "lucide-react";
import mermaid from "mermaid";
import type { AuthSession } from "../../services/auth";
import { ToolRecords, type ToolRecord } from "../../components/ToolRecords";
import { ToolShare } from "../../components/ToolShare";
import { reportToolUsage } from "../../services/toolUsage";

const SAMPLE = `flowchart TD
  A[开始] --> B{是否登录?}
  B -- 是 --> C[进入工具台]
  B -- 否 --> D[游客模式]
  C --> E[同步收藏]
  D --> E`;

type MermaidToolProps = {
  session: AuthSession | null;
};

export function MermaidTool({ session }: MermaidToolProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 });
  const [source, setSource] = useState(SAMPLE);
  const [svg, setSvg] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
      fontFamily: "Archivo, ui-sans-serif, sans-serif",
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventWheelScroll = (event: WheelEvent) => event.preventDefault();
    canvas.addEventListener("wheel", preventWheelScroll, { passive: false });
    return () => canvas.removeEventListener("wheel", preventWheelScroll);
  }, []);

  async function renderDiagram(contentValue: string = source) {
    setBusy(true);
    setSvg("");
    setNotice("");
    setError("");
    try {
      const id = `bocchi-mermaid-${Date.now()}`;
      const result = await mermaid.render(id, contentValue);
      setSvg(result.svg);
      setNotice("渲染完成");
      void reportToolUsage("mermaid");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mermaid 语法解析失败");
    } finally {
      setBusy(false);
    }
  }

  function openRecord(record: ToolRecord) {
    setSource(record.content);
    setNotice("已打开记录");
    setError("");
    void renderDiagram(record.content);
  }

  async function copySvg() {
    if (!svg) return;
    try {
      await navigator.clipboard.writeText(svg);
      setNotice("SVG 已复制");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  function downloadSvg() {
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bocchi-mermaid.svg";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("SVG 已开始下载");
    void reportToolUsage("mermaid");
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
    <section className="diagram-tool" aria-labelledby="mermaid-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><Workflow size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="mermaid-tool-title">文本转图表</h1><p>用 Mermaid 语法生成流程图、时序图、甘特图等图表。</p></div>
      </header>

      <div className="diagram-workbench">
        <label className="diagram-source">
          <span>Mermaid 源码</span>
          <textarea value={source} onChange={(event) => { setSource(event.target.value); setNotice(""); setError(""); }} spellCheck={false} />
        </label>
        <section className="diagram-preview" aria-live="polite">
          <header><span>图表预览</span><small>拖动空白处移动画布</small></header>
          <div
            ref={canvasRef}
            className="diagram-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            <div className="diagram-canvas__content" dangerouslySetInnerHTML={{ __html: svg }} />
            {!svg && <div className="diagram-empty">填写左侧语法后点击“生成图表”。</div>}
          </div>
        </section>
      </div>

      <div className="diagram-actions">
        <button className="tool-button" type="button" onClick={() => setSource(SAMPLE)}><Sparkles size={15} />加载示例</button>
        <button className="tool-button tool-button--primary" type="button" onClick={() => void renderDiagram()} disabled={busy || !source.trim()}><Workflow size={15} />{busy ? "生成中…" : "生成图表"}</button>
        <button className="tool-button" type="button" onClick={() => void copySvg()} disabled={!svg}><Clipboard size={15} />复制 SVG</button>
        <button className="tool-button" type="button" onClick={downloadSvg} disabled={!svg}><Download size={15} />下载 SVG</button>
      </div>

      <ToolRecords
        recordKey="mermaid.records"
        session={session}
        content={source}
        defaultName="Mermaid 图表"
        onOpen={openRecord}
      />

      <ToolShare
        kind="mermaid"
        session={session}
        getContent={() => source}
        defaultTitle="Mermaid 图表"
      />

      <div className="tool-feedback" aria-live="polite">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>支持 flowchart、sequenceDiagram、gantt、pie 等常用 Mermaid 图表。</p>}
      </div>
    </section>
  );
}