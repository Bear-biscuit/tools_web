import { useState } from "react";
import { Check, CircleAlert, Clipboard, Eraser, WandSparkles } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { cleanText, defaultCleanerOptions, type CleanerOptions } from "./cleanerUtils";

const labels: Array<[keyof CleanerOptions, string]> = [
  ["trimLines", "去除行首尾空格"], ["removeEmptyLines", "删除空行"], ["removeDuplicateLines", "删除重复行"],
  ["collapseSpaces", "合并连续空格"], ["removeLineBreaks", "合并换行"], ["stripHtml", "移除 HTML 标签"],
  ["lowercase", "转换为小写"], ["removePunctuation", "移除标点"],
];

export function TextCleanerTool() {
  const [input, setInput] = useState("  Bocchi   tools  \n\nBocchi tools\n<p>Hello World</p>");
  const [options, setOptions] = useState<CleanerOptions>(defaultCleanerOptions);
  const [output, setOutput] = useState("");
  const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  function run() { setOutput(cleanText(input, options)); setError(""); setNotice("文本清理完成。"); void reportToolUsage("cleaner"); }
  async function copyOutput() { if (!output) return; try { await navigator.clipboard.writeText(output); setNotice("结果已复制。"); } catch { setError("浏览器没有允许访问剪贴板。"); } }
  return (
    <section className="cleaner-tool" aria-labelledby="cleaner-tool-title"><header className="tool-heading"><div className="tool-heading__icon"><WandSparkles size={25} /></div><div><h1 id="cleaner-tool-title">文本清理器</h1><p>批量清理空行、重复行、空格、HTML 和格式字符。</p></div></header>
      <div className="cleaner-options">{labels.map(([key, label]) => <button className={options[key] ? "is-active" : ""} key={key} type="button" onClick={() => setOptions((current) => ({ ...current, [key]: !current[key] }))}><Check size={14} />{label}</button>)}</div>
      <div className="cleaner-workbench"><label><span>原始文本</span><textarea value={input} onChange={(event) => { setInput(event.target.value); setOutput(""); }} spellCheck={false} /></label><label><span>清理结果</span><textarea value={output} readOnly placeholder="清理结果会显示在这里" spellCheck={false} /></label></div>
      <div className="cleaner-actions"><button className="tool-button tool-button--primary" type="button" onClick={run}><WandSparkles size={16} />执行清理</button><button className="tool-button" type="button" onClick={() => void copyOutput()} disabled={!output}><Clipboard size={16} />复制结果</button><button className="tool-button" type="button" onClick={() => { setInput(""); setOutput(""); setNotice("已清空文本。"); }}><Eraser size={16} />清空</button></div>
      <div className="tool-feedback">{error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>所有清理操作都在浏览器本地完成。</p>}</div>
    </section>
  );
}