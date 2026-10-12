import { useState } from "react";
import { ArrowRight, Check, CircleAlert, Clipboard, Eraser, GitCompare } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { diffLines, type DiffResult } from "./diffUtils";

const SAMPLE_LEFT = "Bocchi 1.0\nJSON\ntimer\nfilebox";
const SAMPLE_RIGHT = "Bocchi 2.0\nJSON\ntimestamp\nfilebox\npassword";

export function TextDiffTool() {
  const [left, setLeft] = useState(SAMPLE_LEFT);
  const [right, setRight] = useState(SAMPLE_RIGHT);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function compare() {
    try {
      const next = diffLines(left, right);
      setResult(next);
      setNotice(`对比完成：新增 ${next.added} 行，删除 ${next.removed} 行。`);
      setError("");
      void reportToolUsage("diff");
    } catch (reason) {
      setResult(null);
      setNotice("");
      setError(reason instanceof Error ? reason.message : "文本对比失败。");
    }
  }

  async function copyResult() {
    if (!result) return;
    const text = result.lines.map((line) => `${line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}${line.text}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Diff 结果已复制。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  function clearAll() {
    setLeft("");
    setRight("");
    setResult(null);
    setNotice("已清空对比内容。");
    setError("");
  }

  return (
    <section className="diff-tool" aria-labelledby="diff-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><GitCompare size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="diff-tool-title">文本差异对比</h1><p>逐行比较两段文本，标记新增、删除和未变化内容。</p></div>
      </header>

      <div className="diff-input-grid">
        <label className="diff-input-panel">
          <span><strong>原始文本</strong><small>{left.split("\n").length} 行</small></span>
          <textarea value={left} onChange={(event) => { setLeft(event.target.value); setResult(null); setNotice(""); setError(""); }} spellCheck={false} />
        </label>
        <div className="diff-direction" aria-hidden="true"><ArrowRight size={19} /><small>按行比较</small></div>
        <label className="diff-input-panel">
          <span><strong>新文本</strong><small>{right.split("\n").length} 行</small></span>
          <textarea value={right} onChange={(event) => { setRight(event.target.value); setResult(null); setNotice(""); setError(""); }} spellCheck={false} />
        </label>
      </div>

      <div className="diff-actions">
        <button className="tool-button tool-button--primary" type="button" onClick={compare}><GitCompare size={16} />开始对比</button>
        <button className="tool-button" type="button" onClick={() => { setLeft(SAMPLE_LEFT); setRight(SAMPLE_RIGHT); setResult(null); }}>载入示例</button>
        <button className="tool-button" type="button" onClick={() => void copyResult()} disabled={!result}><Clipboard size={16} />复制 Diff</button>
        <button className="tool-button" type="button" onClick={clearAll}><Eraser size={16} />清空</button>
      </div>

      <section className="diff-result-panel" aria-live="polite">
        <header>
          <div><strong>对比结果</strong><small>{result ? `${result.added} 新增 · ${result.removed} 删除 · ${result.unchanged} 未变` : "等待对比"}</small></div>
          <GitCompare size={18} aria-hidden="true" />
        </header>
        {result ? (
          <div className="diff-output">
            {result.lines.map((line, index) => (
              <div className={`diff-line is-${line.type}`} key={`${index}-${line.type}-${line.text}`}>
                <span>{line.leftLine ?? ""}</span>
                <span>{line.rightLine ?? ""}</span>
                <i>{line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}</i>
                <code>{line.text || " "}</code>
              </div>
            ))}
          </div>
        ) : (
          <div className="diff-empty"><GitCompare size={30} strokeWidth={1.6} /><strong>还没有对比结果</strong><p>修改两侧文本后点击开始对比。</p></div>
        )}
      </section>

      <div className="tool-feedback">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>适合对比配置、代码片段、文案和日志行。</p>}
      </div>
    </section>
  );
}