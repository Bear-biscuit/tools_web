import { useMemo, useState } from "react";
import { Check, CircleAlert, Download, FileCode2, ImagePlus, WandSparkles } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { analyzeSvg, optimizeSvg, sanitizeSvg } from "./svgUtils";

const SAMPLE = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="44" fill="#2e5bff"/><path d="M36 62c10-20 38-20 48 0" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/></svg>';

export function SvgTool() {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState("");
  const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const stats = useMemo(() => analyzeSvg(output || input), [input, output]);
  const preview = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitizeSvg(output || input))}`, [input, output]);

  function optimize() { try { const next = optimizeSvg(input); setOutput(next); setNotice("SVG 已优化。"); setError(""); void reportToolUsage("svg"); } catch (reason) { setError(reason instanceof Error ? reason.message : "SVG 优化失败。"); } }
  function download() { const content = output || optimizeSvg(input); const url = URL.createObjectURL(new Blob([content], { type: "image/svg+xml" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "bocchi-optimized.svg"; anchor.click(); URL.revokeObjectURL(url); void reportToolUsage("svg"); }
  function handleFile(file?: File) { if (!file) return; const reader = new FileReader(); reader.onload = () => { setInput(String(reader.result ?? "")); setOutput(""); setNotice("SVG 文件已载入。"); setError(""); }; reader.onerror = () => setError("SVG 文件读取失败。"); reader.readAsText(file); }

  return (
    <section className="svg-tool" aria-labelledby="svg-tool-title"><header className="tool-heading"><div className="tool-heading__icon"><FileCode2 size={25} /></div><div><h1 id="svg-tool-title">SVG 预览与优化</h1><p>清理 SVG 注释、元数据、编辑器属性，并安全预览和导出。</p></div></header>
      <div className="svg-stats"><span>{stats.bytes} 字节</span><span>{stats.elements} 个元素</span><span>{stats.paths} 条路径</span><span>viewBox：{stats.viewBox}</span></div>
      <div className="svg-workbench"><label><span>SVG 源码</span><textarea value={input} onChange={(event) => { setInput(event.target.value); setOutput(""); }} spellCheck={false} /></label><section className="svg-preview"><span>安全预览</span><div><img src={preview} alt="SVG 预览" /></div></section></div>
      <div className="svg-actions"><button className="tool-button tool-button--primary" type="button" onClick={optimize}><WandSparkles size={16} />优化 SVG</button><button className="tool-button" type="button" onClick={download}><Download size={16} />下载 SVG</button><label className="tool-button"><ImagePlus size={16} />选择文件<input type="file" accept=".svg,image/svg+xml" className="visually-hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ""; }} /></label></div>
      <div className="tool-feedback">{error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>预览会移除脚本、外部对象和事件属性。</p>}</div>
    </section>
  );
}