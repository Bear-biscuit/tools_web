import { useState } from "react";
import { Check, CircleAlert, Clipboard, FileUp, Hash, RefreshCw } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { compareHash, hashFile, hashText, type HashAlgorithm } from "./hashUtils";

const algorithms: HashAlgorithm[] = ["SHA-256", "SHA-1", "SHA-384", "SHA-512"];

export function HashTool() {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [text, setText] = useState("Bocchi");
  const [file, setFile] = useState<File | null>(null);
  const [digest, setDigest] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [expected, setExpected] = useState("");
  const [error, setError] = useState("");

  async function calculate() {
    setBusy(true);
    try {
      const result = mode === "text" ? await hashText(text, algorithm) : file ? await hashFile(file, algorithm) : "";
      if (!result) throw new Error("请先选择文件。");
      setDigest(result);
      setNotice(`${algorithm} 计算完成。`);
      setError("");
      void reportToolUsage("hash");
    } catch (reason) {
      setDigest("");
      setNotice("");
      setError(reason instanceof Error ? reason.message : "哈希计算失败。");
    } finally {
      setBusy(false);
    }
  }

  const comparison = compareHash(digest, expected);

  async function copyDigest() {
    if (!digest) return;
    try {
      await navigator.clipboard.writeText(digest);
      setNotice("摘要已复制。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  return (
    <section className="hash-tool" aria-labelledby="hash-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><Hash size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="hash-tool-title">哈希计算器</h1><p>计算文本或文件摘要，支持 SHA-1、SHA-256、SHA-384 和 SHA-512。</p></div>
      </header>

      <div className="hash-options">
        <div className="hash-mode-switch">
          <button className={mode === "text" ? "is-active" : ""} type="button" onClick={() => setMode("text")}>文本</button>
          <button className={mode === "file" ? "is-active" : ""} type="button" onClick={() => setMode("file")}>文件</button>
        </div>
        <label><span>算法</span><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HashAlgorithm)}>{algorithms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>

      {mode === "text" ? (
        <textarea className="hash-textarea" value={text} onChange={(event) => { setText(event.target.value); setDigest(""); }} spellCheck={false} placeholder="输入要计算哈希的文本" />
      ) : (
        <label className="hash-file-drop">
          <FileUp size={30} strokeWidth={1.7} aria-hidden="true" />
          <strong>{file ? file.name : "选择要计算哈希的文件"}</strong>
          <span>{file ? `${(file.size / 1024).toFixed(1)} KB` : "文件只在浏览器本地读取，不会上传"}</span>
          <input type="file" className="visually-hidden" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setDigest(""); event.target.value = ""; }} />
        </label>
      )}

      <div className="hash-actions">
        <button className="tool-button tool-button--primary" type="button" onClick={() => void calculate()} disabled={busy}><RefreshCw size={16} />计算哈希</button>
        <button className="tool-button" type="button" onClick={() => void copyDigest()} disabled={!digest}><Clipboard size={16} />复制摘要</button>
      </div>

      <section className="hash-output" aria-live="polite">
        <header><span>{algorithm} 摘要</span><small>{digest ? `${digest.length} 个十六进制字符` : "等待计算"}</small></header>
        <code>{digest || "摘要会显示在这里"}</code>
        <div className="hash-compare"><label><span>预期摘要</span><input value={expected} onChange={(event) => setExpected(event.target.value)} placeholder="粘贴需要核对的摘要" /></label><strong className={`is-${comparison}`}>{comparison === "match" ? "摘要一致" : comparison === "mismatch" ? "摘要不一致" : "等待输入"}</strong></div>
      </section>

      <div className="tool-feedback">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>哈希不可逆，常用于校验文件完整性和内容一致性。</p>}
      </div>
    </section>
  );
}