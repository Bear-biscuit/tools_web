import { useMemo, useState } from "react";
import { Check, CircleAlert, Clipboard, ExternalLink, Link2, Plus, Search, Trash2 } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { buildUrl, createQueryParameter, parseUrl, type ParsedUrl, type QueryParameter } from "./urlUtils";

const DEFAULT_URL = "https://example.com/search?q=bocchi&lang=zh#results";

export function UrlParserTool() {
  const [input, setInput] = useState(DEFAULT_URL);
  const [parsed, setParsed] = useState<ParsedUrl | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const rebuiltUrl = useMemo(() => parsed ? buildUrl(parsed) : "", [parsed]);

  function parse() {
    try {
      setParsed(parseUrl(input));
      setNotice("URL 已解析，可以继续编辑 Query 参数。");
      setError("");
      void reportToolUsage("url");
    } catch (reason) {
      setParsed(null);
      setNotice("");
      setError(reason instanceof Error ? reason.message : "URL 解析失败。");
    }
  }

  function updateQuery(id: string, field: keyof Pick<QueryParameter, "key" | "value">, value: string) {
    setParsed((current) => current ? {
      ...current,
      query: current.query.map((parameter) => parameter.id === id ? { ...parameter, [field]: value } : parameter),
    } : current);
    setNotice("");
    setError("");
  }

  function addQuery() {
    setParsed((current) => current ? { ...current, query: [...current.query, createQueryParameter(current.query.length)] } : current);
  }

  function removeQuery(id: string) {
    setParsed((current) => current ? { ...current, query: current.query.filter((parameter) => parameter.id !== id) } : current);
  }

  async function copyUrl() {
    if (!rebuiltUrl) return;
    try {
      await navigator.clipboard.writeText(rebuiltUrl);
      setNotice("编辑后的 URL 已复制。");
      setError("");
      void reportToolUsage("url");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  return (
    <section className="url-tool" aria-labelledby="url-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><Link2 size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="url-tool-title">URL 解析器</h1><p>拆解 URL 结构，编辑 Query 参数，再复制新的地址。</p></div>
      </header>

      <div className="url-input-bar">
        <label><Search size={17} aria-hidden="true" /><input value={input} onChange={(event) => { setInput(event.target.value); setNotice(""); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") parse(); }} placeholder="粘贴完整 URL 或 example.com/path" spellCheck={false} /></label>
        <button className="tool-button tool-button--primary" type="button" onClick={parse}>解析 URL</button>
      </div>

      {parsed ? (
        <>
          <section className="url-anatomy" aria-label="URL 组成">
            <span><small>协议</small><strong>{parsed.protocol}</strong></span>
            <span><small>主机</small><strong>{parsed.hostname}{parsed.port ? `:${parsed.port}` : ""}</strong></span>
            <span><small>路径</small><strong>{parsed.pathname || "/"}</strong></span>
            <span><small>Hash</small><strong>{parsed.hash || "无"}</strong></span>
          </section>

          <section className="url-query-panel">
            <header><div><strong>Query 参数</strong><small>{parsed.query.length} 个参数</small></div><button className="tool-button" type="button" onClick={addQuery}><Plus size={15} />添加参数</button></header>
            <div className="url-query-list">
              {parsed.query.length ? parsed.query.map((parameter) => (
                <div className="url-query-row" key={parameter.id}>
                  <input value={parameter.key} onChange={(event) => updateQuery(parameter.id, "key", event.target.value)} placeholder="参数名" aria-label="参数名" />
                  <span aria-hidden="true">=</span>
                  <input value={parameter.value} onChange={(event) => updateQuery(parameter.id, "value", event.target.value)} placeholder="参数值" aria-label="参数值" />
                  <button type="button" onClick={() => removeQuery(parameter.id)} aria-label="删除参数"><Trash2 size={15} /></button>
                </div>
              )) : <p className="url-query-empty">当前 URL 没有 Query 参数。</p>}
            </div>
          </section>

          <section className="url-result-card">
            <header><span>编辑后的 URL</span><div><button type="button" onClick={() => void copyUrl()}><Clipboard size={15} />复制</button><a href={rebuiltUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />打开</a></div></header>
            <code>{rebuiltUrl}</code>
          </section>
        </>
      ) : (
        <div className="url-empty-state"><Link2 size={34} strokeWidth={1.6} /><strong>等待解析 URL</strong><p>解析后会显示协议、主机、路径、Hash 和可编辑的 Query 参数。</p></div>
      )}

      <div className="tool-feedback" aria-live="polite">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>缺少协议时会自动按 HTTPS 处理。</p>}
      </div>
    </section>
  );
}