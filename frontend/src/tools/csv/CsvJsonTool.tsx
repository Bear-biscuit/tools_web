import { useState } from "react";
import { ArrowLeftRight, Braces, Check, CircleAlert, Clipboard, Download, FileSpreadsheet } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { csvToJson, jsonToCsv } from "./csvUtils";

const CSV_SAMPLE = "name,role,active\nBocchi,owner,true\nNova,tool,false";

export function CsvJsonTool() {
  const [mode, setMode] = useState<"csv-json" | "json-csv">("csv-json");
  const [input, setInput] = useState(CSV_SAMPLE);
  const [output, setOutput] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function run() {
    try {
      if (mode === "csv-json") {
        setOutput(JSON.stringify(csvToJson(input), null, 2));
      } else {
        setOutput(jsonToCsv(JSON.parse(input)));
      }
      setNotice("转换完成。");
      setError("");
      void reportToolUsage("csv");
    } catch (reason) {
      setOutput("");
      setNotice("");
      setError(reason instanceof Error ? reason.message : "转换失败。");
    }
  }

  function switchMode(next: "csv-json" | "json-csv") {
    setMode(next);
    setInput(next === "csv-json" ? CSV_SAMPLE : JSON.stringify([{ name: "Bocchi", role: "owner" }], null, 2));
    setOutput("");
    setNotice("");
    setError("");
  }

  async function copyOutput() {
    if (!output) return;
    try { await navigator.clipboard.writeText(output); setNotice("结果已复制。"); } catch { setError("浏览器没有允许访问剪贴板。"); }
  }

  function downloadOutput() {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: mode === "csv-json" ? "application/json" : "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = mode === "csv-json" ? "bocchi-data.json" : "bocchi-data.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    void reportToolUsage("csv");
  }

  return (
    <section className="csv-tool" aria-labelledby="csv-tool-title">
      <header className="tool-heading"><div className="tool-heading__icon"><FileSpreadsheet size={25} /></div><div><h1 id="csv-tool-title">CSV / JSON 转换</h1><p>在表格文本和结构化 JSON 之间转换，支持引号、逗号和换行。</p></div></header>
      <div className="csv-mode-switch"><button className={mode === "csv-json" ? "is-active" : ""} type="button" onClick={() => switchMode("csv-json")}><FileSpreadsheet size={15} />CSV → JSON</button><button className={mode === "json-csv" ? "is-active" : ""} type="button" onClick={() => switchMode("json-csv")}><Braces size={15} />JSON → CSV</button></div>
      <div className="csv-workbench"><label><span>{mode === "csv-json" ? "CSV 输入" : "JSON 输入"}</span><textarea value={input} onChange={(event) => { setInput(event.target.value); setOutput(""); }} spellCheck={false} /></label><div className="csv-direction"><ArrowLeftRight size={20} /><small>转换</small></div><label><span>{mode === "csv-json" ? "JSON 输出" : "CSV 输出"}</span><textarea value={output} readOnly spellCheck={false} placeholder="转换结果会显示在这里" /></label></div>
      <div className="csv-actions"><button className="tool-button tool-button--primary" type="button" onClick={run}><ArrowLeftRight size={16} />执行转换</button><button className="tool-button" type="button" disabled={!output} onClick={() => void copyOutput()}><Clipboard size={16} />复制结果</button><button className="tool-button" type="button" disabled={!output} onClick={downloadOutput}><Download size={16} />下载</button></div>
      <div className="tool-feedback">{error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>CSV 第一行默认作为字段名。</p>}</div>
    </section>
  );
}