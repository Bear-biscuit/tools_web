import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Link2 } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import mermaid from "mermaid";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { getShare, type SharedContent } from "../services/share";
import { BrandMark } from "./BrandMark";

const TLDRAW_LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string | undefined;

function MermaidShare({ source }: { source: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "default" });
    mermaid
      .render(`shared-mermaid-${Date.now()}`, source)
      .then((result) => {
        if (active) setSvg(result.svg);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "图表解析失败。");
      });
    return () => {
      active = false;
    };
  }, [source]);

  if (error) return <p className="shared-error"><CircleAlert size={16} />{error}</p>;
  return <div className="shared-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function MindmapShare({ source }: { source: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    try {
      const transformer = new Transformer();
      const { root } = transformer.transform(source);
      svg.replaceChildren();
      const markmap = Markmap.create(svg, { duration: 250, pan: true, zoom: true, scrollForPan: false });
      markmap.setData(root);
      void markmap.fit();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "思维导图解析失败。");
    }
  }, [source]);

  if (error) return <p className="shared-error"><CircleAlert size={16} />{error}</p>;
  return <svg ref={ref} className="shared-mindmap" />;
}

function MarkdownShare({ source }: { source: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(source, { async: false }) as string), [source]);
  return <article className="shared-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

function CodeCardShare({ content }: { content: string }) {
  if (!content.startsWith("data:image/")) {
    return <p className="shared-error">分享内容不是有效图片。</p>;
  }
  return (
    <div className="shared-codecard">
      <img src={content} alt="代码卡片" />
    </div>
  );
}

function WhiteboardShare({ content }: { content: string }) {
  const data = useMemo(() => {
    try {
      const parsed = JSON.parse(content) as { elements?: unknown; files?: unknown };
      return { elements: parsed.elements ?? [], files: parsed.files ?? {} };
    } catch {
      return null;
    }
  }, [content]);

  if (!data) return <p className="shared-error">白板数据无法解析。</p>;
  return (
    <div className="shared-whiteboard">
      <Excalidraw
        initialData={{ elements: data.elements as never, files: data.files as never }}
        viewModeEnabled
      />
    </div>
  );
}

function FlowboardShare({ content }: { content: string }) {
  const snapshot = useMemo(() => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  if (!snapshot) return <p className="shared-error">流程图数据无法解析。</p>;
  return (
    <div className="shared-flowboard">
      <Tldraw
        snapshot={snapshot}
        licenseKey={TLDRAW_LICENSE_KEY}
        onMount={(editor) => {
          editor.updateInstanceState({ isReadonly: true });
        }}
      />
    </div>
  );
}

function TextShare({ content }: { content: string }) {
  return <pre className="shared-text">{content}</pre>;
}

function renderShare(share: SharedContent) {
  switch (share.kind) {
    case "mermaid":
      return <MermaidShare source={share.content} />;
    case "mindmap":
      return <MindmapShare source={share.content} />;
    case "markdown":
      return <MarkdownShare source={share.content} />;
    case "codecard":
      return <CodeCardShare content={share.content} />;
    case "whiteboard":
      return <WhiteboardShare content={share.content} />;
    case "flowboard":
      return <FlowboardShare content={share.content} />;
    default:
      return <TextShare content={share.content} />;
  }
}

type SharedPageProps = {
  code: string;
};

export function SharedPage({ code }: SharedPageProps) {
  const [share, setShare] = useState<SharedContent | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setState("loading");
    getShare(code)
      .then((data) => {
        if (!active) return;
        setShare(data);
        setState("ready");
        document.title = `${data.title} - Bocchi 工具台分享`;
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "分享不存在或已失效。");
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [code]);

  return (
    <main className="shared-page">
      <header className="shared-header">
        <a className="shared-brand" href="/">
          <span><BrandMark /></span>
          Bocchi 工具台
        </a>
        <div>
          <h1>{share?.title ?? "分享内容"}</h1>
          {share && <p>由 Bocchi 工具台分享</p>}
        </div>
        <a className="shared-home" href="/">
          <Link2 size={15} aria-hidden="true" />
          打开工具台
        </a>
      </header>

      <section className="shared-body">
        {state === "loading" && <p className="shared-loading">正在加载分享内容…</p>}
        {state === "error" && (
          <div className="shared-error-card">
            <CircleAlert size={28} aria-hidden="true" />
            <h2>无法打开分享</h2>
            <p>{error}</p>
            <a href="/">返回 Bocchi 工具台</a>
          </div>
        )}
        {state === "ready" && share && renderShare(share)}
      </section>
    </main>
  );
}