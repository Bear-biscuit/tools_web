import { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, Clipboard, Download, Eye, FileText, Pencil, Sparkles } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { getMarkdownStats, renderMarkdown } from "./markdownUtils";

const STORAGE_KEY = "nova.markdown.input";
const SAMPLE = `# Bocchi Markdown

把左侧内容写成 Markdown，右侧会实时显示排版结果。

## 支持内容

- **粗体**、*斜体*、~~删除线~~
- [链接](https://example.com)
- 行内代码 \`const answer = 42\`
- 引用、列表、表格和代码块

> 所有渲染都在浏览器本地完成。

\`\`\`ts
function hello(name: string) {
  return \`Hello, \${name}\`;
}
\`\`\`
`;

export function MarkdownTool() {
  const [source, setSource] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) ?? SAMPLE; } catch { return SAMPLE; }
  });
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const stats = useMemo(() => getMarkdownStats(source), [source]);
  const rendered = useMemo(() => renderMarkdown(source), [source]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, source); } catch { /* optional */ }
  }, [source]);

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(rendered);
      setNotice("HTML 已复制。");
      setError("");
      void reportToolUsage("markdown");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  function downloadHtml() {
    const page = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>Bocchi Markdown</title></head><body>${rendered}</body></html>`;
    const url = URL.createObjectURL(new Blob([page], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bocchi-markdown.html";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("HTML 文件已开始下载。");
    setError("");
    void reportToolUsage("markdown");
  }

  function clearAll() {
    setSource("");
    setNotice("已清空 Markdown。");
    setError("");
  }

  return (
    <section className="markdown-tool" aria-labelledby="markdown-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><FileText size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="markdown-tool-title">Markdown 编辑器</h1><p>写作、实时预览、复制 HTML，并导出独立网页。</p></div>
      </header>

      <div className="markdown-toolbar">
        <div className="markdown-stats"><span>{stats.words} 词</span><span>{stats.characters} 字符</span><span>{stats.lines} 行</span><span>约 {stats.readingMinutes} 分钟</span></div>
        <div className="markdown-actions">
          <button className="tool-button" type="button" onClick={() => setSource(SAMPLE)}><Sparkles size={15} aria-hidden="true" />载入示例</button>
          <button className="tool-button" type="button" onClick={() => void copyHtml()} disabled={!rendered}><Clipboard size={15} aria-hidden="true" />复制 HTML</button>
          <button className="tool-button tool-button--primary" type="button" onClick={downloadHtml} disabled={!rendered}><Download size={15} aria-hidden="true" />导出 HTML</button>
          <button className="tool-button" type="button" onClick={clearAll} disabled={!source}>清空</button>
        </div>
      </div>

      <div className="mobile-tool-tabs markdown-mobile-tabs" aria-label="Markdown 区域">
        <button className={mobileView === "edit" ? "is-active" : ""} type="button" onClick={() => setMobileView("edit")}><Pencil size={14} />编辑</button>
        <button className={mobileView === "preview" ? "is-active" : ""} type="button" onClick={() => setMobileView("preview")}><Eye size={14} />预览</button>
      </div>

      <div className={`markdown-workbench is-${mobileView}`}>
        <section className="markdown-pane markdown-pane--editor">
          <header><span>Markdown</span><small>草稿自动保存在本机</small></header>
          <textarea value={source} onChange={(event) => { setSource(event.target.value); setNotice(""); setError(""); }} spellCheck={false} placeholder="在这里写 Markdown…" />
        </section>
        <section className="markdown-pane markdown-pane--preview">
          <header><span>预览</span><small>已过滤不安全 HTML</small></header>
          <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: rendered }} />
        </section>
      </div>

      <div className="tool-feedback" aria-live="polite">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>支持 GFM 表格、任务列表、代码块和换行。</p>}
      </div>
    </section>
  );
}