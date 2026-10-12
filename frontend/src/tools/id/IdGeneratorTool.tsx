import { useState } from "react";
import { Check, CircleAlert, Clipboard, Fingerprint, RefreshCw } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { generateIds, type IdKind, type IdOptions } from "./idUtils";

const initialOptions: IdOptions = { kind: "uuid", count: 5, length: 16, uppercase: false, prefix: "" };

export function IdGeneratorTool() {
  const [options, setOptions] = useState<IdOptions>(initialOptions);
  const [ids, setIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function generate() {
    try {
      const next = generateIds(options);
      setIds(next);
      setNotice(`已生成 ${next.length} 个标识符。`);
      setError("");
      void reportToolUsage("id");
    } catch (reason) {
      setIds([]);
      setNotice("");
      setError(reason instanceof Error ? reason.message : "标识符生成失败。");
    }
  }

  async function copyAll() {
    if (!ids.length) return;
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      setNotice("全部标识符已复制。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  async function copyOne(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("标识符已复制。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  return (
    <section className="id-tool" aria-labelledby="id-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><Fingerprint size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="id-tool-title">UUID / 随机 ID</h1><p>批量生成 UUID、可读短 ID 或十六进制标识符。</p></div>
      </header>

      <div className="id-options">
        <div className="id-kind-switch" role="tablist" aria-label="ID 类型">
          {(["uuid", "short", "hex"] as IdKind[]).map((kind) => (
            <button className={options.kind === kind ? "is-active" : ""} key={kind} type="button" role="tab" aria-selected={options.kind === kind} onClick={() => setOptions((current) => ({ ...current, kind }))}>
              {kind === "uuid" ? "UUID v4" : kind === "short" ? "短 ID" : "HEX"}
            </button>
          ))}
        </div>
        <label><span>生成数量</span><input type="number" min="1" max="200" value={options.count} onChange={(event) => setOptions((current) => ({ ...current, count: Number(event.target.value) }))} /></label>
        {options.kind !== "uuid" && <label><span>长度</span><input type="number" min="4" max={options.kind === "short" ? 64 : 128} value={options.length} onChange={(event) => setOptions((current) => ({ ...current, length: Number(event.target.value) }))} /></label>}
        <label className="id-prefix"><span>前缀</span><input value={options.prefix} onChange={(event) => setOptions((current) => ({ ...current, prefix: event.target.value }))} placeholder="例如 id_" /></label>
        <label className="id-check"><input type="checkbox" checked={options.uppercase} disabled={options.kind === "uuid"} onChange={(event) => setOptions((current) => ({ ...current, uppercase: event.target.checked }))} /><span>使用大写字母</span></label>
      </div>

      <div className="id-actions">
        <button className="tool-button tool-button--primary" type="button" onClick={generate}><RefreshCw size={16} />生成标识符</button>
        <button className="tool-button" type="button" onClick={() => void copyAll()} disabled={!ids.length}><Clipboard size={16} />复制全部</button>
      </div>

      <section className="id-output-panel" aria-live="polite">
        <header><span>生成结果</span><small>{ids.length} 个</small></header>
        {ids.length ? (
          <div className="id-list">
            {ids.map((value, index) => (
              <button key={`${value}-${index}`} type="button" onClick={() => void copyOne(value)}>
                <span>{String(index + 1).padStart(3, "0")}</span>
                <code>{value}</code>
                <Clipboard size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="id-empty"><Fingerprint size={32} strokeWidth={1.6} /><strong>等待生成</strong><p>选择类型和数量后点击生成标识符。</p></div>
        )}
      </section>

      <div className="tool-feedback">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>短 ID 默认排除容易混淆的字符。</p>}
      </div>
    </section>
  );
}