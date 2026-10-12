import { useMemo, useRef, useState } from "react";
import { Download, FileImage, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-bash";
import { reportToolUsage } from "../../services/toolUsage";
import type { AuthSession } from "../../services/auth";
import { ToolShare } from "../../components/ToolShare";

const SAMPLE = `function greet(name: string) {\n  return \`Hello, \${name}! Welcome to Bocchi Tools.\`;\n}\n\nconsole.log(greet("Nova"));`;
const LANGUAGES = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "json", label: "JSON" },
  { value: "css", label: "CSS" },
  { value: "bash", label: "Bash" },
];
const THEMES = [
  { value: "midnight", label: "午夜蓝" },
  { value: "sakura", label: "樱花粉" },
  { value: "mint", label: "薄荷绿" },
  { value: "sunset", label: "落日橙" },
];

export function CodeCardTool({ session }: { session: AuthSession | null }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState(SAMPLE);
  const [language, setLanguage] = useState("typescript");
  const [theme, setTheme] = useState("midnight");
  const [title, setTitle] = useState("bocchi-code-card");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const highlighted = useMemo(() => {
    const grammar = Prism.languages[language] ?? Prism.languages.javascript;
    return Prism.highlight(code, grammar, language);
  }, [code, language]);

  async function exportDataUrl() {
    if (!previewRef.current) throw new Error("卡片尚未准备好。");
    return toPng(previewRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#0f172a",
    });
  }

  async function exportCard() {
    if (!previewRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0f172a",
      });
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `${title || "bocchi-code-card"}.png`;
      anchor.click();
      setNotice("图片已开始下载");
      void reportToolUsage("codecard");
    } catch {
      setNotice("导出失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="code-card-tool" aria-labelledby="code-card-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><FileImage size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="code-card-tool-title">代码分享卡片</h1><p>把代码生成漂亮的可分享图片。</p></div>
      </header>

      <div className="code-card-workbench">
        <section className="code-card-editor">
          <div className="code-card-fields">
            <label><span>标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="卡片标题" /></label>
            <label><span>语言</span><select value={language} onChange={(event) => setLanguage(event.target.value)}>{LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label><span>主题</span><select value={theme} onChange={(event) => setTheme(event.target.value)}>{THEMES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
          <label className="code-card-input">
            <span>代码</span>
            <textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} />
          </label>
          <div className="code-card-actions">
            <button className="tool-button" type="button" onClick={() => setCode(SAMPLE)}><Sparkles size={15} />加载示例</button>
            <button className="tool-button tool-button--primary" type="button" onClick={() => void exportCard()} disabled={busy || !code.trim()}><Download size={15} />{busy ? "导出中…" : "导出图片"}</button>
          </div>
        </section>

        <section className="code-card-preview-panel">
          <header><span>卡片预览</span><small>点击导出后下载 PNG</small></header>
          <div className={`code-card-preview is-${theme}`}>
            <div className="code-card-window" ref={previewRef}>
              <div className="code-card-window__bar"><i /><i /><i /><span>{title || "bocchi-code-card"}</span></div>
              <pre className="code-card-code"><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
              <footer><span>{language}</span><strong>Bocchi Tools</strong></footer>
            </div>
          </div>
        </section>
      </div>

      <ToolShare
        kind="codecard"
        session={session}
        getContent={exportDataUrl}
        defaultTitle={title || "代码分享卡片"}
      />

      <div className="tool-feedback">{notice && <p>{notice}</p>}</div>
    </section>
  );
}