import { useState } from "react";
import { Check, CircleAlert, Clipboard, KeyRound, ShieldAlert } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { decodeJwt, getJwtTimeState, type DecodedJwt } from "./jwtUtils";

const SAMPLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJuYW1lIjoiQm9jY2hpIiwicm9sZSI6Im93bmVyIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjQxMzM4OTc2MDB9.signature";

export function JwtTool() {
  const [token, setToken] = useState(SAMPLE);
  const [decoded, setDecoded] = useState<DecodedJwt | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function parse() {
    try {
      const next = decodeJwt(token);
      setDecoded(next);
      setNotice("JWT 已解析，仅完成内容解码，没有验证签名。");
      setError("");
      void reportToolUsage("jwt");
    } catch (reason) {
      setDecoded(null);
      setNotice("");
      setError(reason instanceof Error ? reason.message : "JWT 解析失败。");
    }
  }

  async function copySection(value: unknown, label: string) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setNotice(`${label} 已复制。`);
      setError("");
      void reportToolUsage("jwt");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  const timeState = decoded ? getJwtTimeState(decoded.payload) : null;

  return (
    <section className="jwt-tool" aria-labelledby="jwt-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><KeyRound size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="jwt-tool-title">JWT 解析器</h1><p>查看 Header、Payload 和过期时间，不验证签名。</p></div>
      </header>

      <div className="jwt-warning"><ShieldAlert size={16} /><span>只适合检查自己的 Token。不要在不可信页面粘贴生产环境凭据。</span></div>

      <div className="jwt-input-bar">
        <textarea value={token} onChange={(event) => { setToken(event.target.value); setDecoded(null); setNotice(""); setError(""); }} spellCheck={false} placeholder="粘贴 JWT，格式为 header.payload.signature" />
        <button className="tool-button tool-button--primary" type="button" onClick={parse} disabled={!token.trim()}>解析 JWT</button>
      </div>

      {decoded ? (
        <>
          <div className="jwt-status-row">
            <span className={timeState?.expired ? "is-expired" : "is-valid"}>{timeState?.expiration ? (timeState.expired ? "已过期" : "未过期") : "没有 exp 字段"}</span>
            {timeState?.issuedAt && <span>签发：{new Date(timeState.issuedAt).toLocaleString()}</span>}
            {timeState?.expiration && <span>过期：{new Date(timeState.expiration).toLocaleString()}</span>}
          </div>
          <div className="jwt-sections">
            <section className="jwt-section is-header"><header><span>Header</span><button type="button" onClick={() => void copySection(decoded.header, "Header")}><Clipboard size={14} /></button></header><pre>{JSON.stringify(decoded.header, null, 2)}</pre></section>
            <section className="jwt-section is-payload"><header><span>Payload</span><button type="button" onClick={() => void copySection(decoded.payload, "Payload")}><Clipboard size={14} /></button></header><pre>{JSON.stringify(decoded.payload, null, 2)}</pre></section>
            <section className="jwt-section is-signature"><header><span>Signature</span><small>原始片段</small></header><code>{decoded.signature}</code></section>
          </div>
        </>
      ) : (
        <div className="jwt-empty"><KeyRound size={34} strokeWidth={1.6} /><strong>等待 JWT</strong><p>解析后 Header、Payload 和签名片段会分开显示。</p></div>
      )}

      <div className="tool-feedback">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>JWT 解析不会验证签名、算法或签发者。</p>}
      </div>
    </section>
  );
}