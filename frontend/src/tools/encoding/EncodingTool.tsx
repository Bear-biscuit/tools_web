import { useState } from "react";
import {
  ArrowLeftRight,
  Binary,
  Check,
  CircleAlert,
  Clipboard,
  Eraser,
  Link2,
} from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import {
  decodeBase64,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  type Base64Variant,
  type UrlMode,
} from "./encodingUtils";

type EncodingMode = "base64" | "url";
type Direction = "encode" | "decode";

export function EncodingTool() {
  const [mode, setMode] = useState<EncodingMode>("base64");
  const [direction, setDirection] = useState<Direction>("encode");
  const [base64Variant, setBase64Variant] = useState<Base64Variant>("standard");
  const [urlMode, setUrlMode] = useState<UrlMode>("component");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const inputBytes = new TextEncoder().encode(input).length;
  const outputBytes = new TextEncoder().encode(output).length;
  const actionLabel = direction === "encode" ? "编码" : "解码";
  const modeLabel = mode === "base64" ? "Base64" : "URL";

  function switchMode(nextMode: EncodingMode) {
    setMode(nextMode);
    setOutput("");
    setError("");
    setNotice("");
  }

  function switchDirection(nextDirection: Direction) {
    setDirection(nextDirection);
    setOutput("");
    setError("");
    setNotice("");
  }

  function execute() {
    try {
      const result = mode === "base64"
        ? direction === "encode"
          ? encodeBase64(input, base64Variant)
          : decodeBase64(input, base64Variant)
        : direction === "encode"
          ? encodeUrl(input, urlMode)
          : decodeUrl(input, urlMode);

      setOutput(result);
      setError("");
      setNotice(`${modeLabel} ${actionLabel}完成。`);
      void reportToolUsage("encoding");
    } catch (reason) {
      setOutput("");
      setNotice("");
      setError(reason instanceof Error ? reason.message : `${modeLabel} ${actionLabel}失败。`);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setNotice("输出结果已复制。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  function swapSides() {
    if (!output) return;
    setInput(output);
    setOutput(input);
    setDirection((current) => current === "encode" ? "decode" : "encode");
    setError("");
    setNotice("输入和输出已交换。");
  }

  function clearAll() {
    setInput("");
    setOutput("");
    setError("");
    setNotice("已清空输入和输出。");
  }
  return (
    <section className="encoding-tool" aria-labelledby="encoding-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <Binary size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="encoding-tool-title">Base64 / URL 编解码</h1>
          <p>在 UTF-8 文本、Base64、URL 组件和完整 URL 之间转换。</p>
        </div>
      </header>

      <div className="encoding-modebar">
        <div className="encoding-mode-switch" role="tablist" aria-label="编码类型">
          <button className={mode === "base64" ? "is-active" : ""} type="button" role="tab" aria-selected={mode === "base64"} onClick={() => switchMode("base64")}>
            <Binary size={15} aria-hidden="true" />Base64
          </button>
          <button className={mode === "url" ? "is-active" : ""} type="button" role="tab" aria-selected={mode === "url"} onClick={() => switchMode("url")}>
            <Link2 size={15} aria-hidden="true" />URL
          </button>
        </div>
        <div className="encoding-direction-switch" aria-label="转换方向">
          <button className={direction === "encode" ? "is-active" : ""} type="button" onClick={() => switchDirection("encode")}>编码</button>
          <button className={direction === "decode" ? "is-active" : ""} type="button" onClick={() => switchDirection("decode")}>解码</button>
        </div>
      </div>

      <div className="encoding-options">
        {mode === "base64" ? (
          <>
            <span>输出变体</span>
            <div>
              <button className={base64Variant === "standard" ? "is-active" : ""} type="button" onClick={() => setBase64Variant("standard")}>标准 Base64</button>
              <button className={base64Variant === "url" ? "is-active" : ""} type="button" onClick={() => setBase64Variant("url")}>URL 安全</button>
            </div>
          </>
        ) : (
          <>
            <span>URL 范围</span>
            <div>
              <button className={urlMode === "component" ? "is-active" : ""} type="button" onClick={() => setUrlMode("component")}>单个组件</button>
              <button className={urlMode === "full" ? "is-active" : ""} type="button" onClick={() => setUrlMode("full")}>完整 URL</button>
            </div>
          </>
        )}
      </div>

      <div className={`encoding-workbench is-${direction}`}>
        <section className="encoding-panel">
          <header>
            <span>输入</span>
            <small>{input.length} 字符 · {inputBytes} 字节</small>
          </header>
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput("");
              setError("");
              setNotice("");
            }}
            placeholder={direction === "encode" ? "输入要编码的文本或 URL" : `输入要解码的 ${modeLabel} 内容`}
            spellCheck={false}
          />
        </section>

        <div className="encoding-pipeline" aria-hidden="true">
          <span><ArrowLeftRight size={18} /></span>
          <small>{modeLabel} · {actionLabel}</small>
        </div>
        <section className="encoding-panel encoding-panel--output">
          <header>
            <span>输出</span>
            <small>{output.length} 字符 · {outputBytes} 字节</small>
          </header>
          <textarea value={output} readOnly placeholder="转换结果会显示在这里" spellCheck={false} />
        </section>
      </div>

      <div className="encoding-actions">
        <button className="tool-button tool-button--primary" type="button" onClick={execute} disabled={!input}>
          <ArrowLeftRight size={16} aria-hidden="true" />
          执行{actionLabel}
        </button>
        <button className="tool-button" type="button" onClick={swapSides} disabled={!output}>交换输入输出</button>
        <button className="tool-button" type="button" onClick={() => void copyOutput()} disabled={!output}>
          <Clipboard size={16} aria-hidden="true" />复制结果
        </button>
        <button className="tool-button" type="button" onClick={clearAll} disabled={!input && !output}>
          <Eraser size={16} aria-hidden="true" />清空
        </button>
      </div>

      <div className="tool-feedback" aria-live="polite">
        {error ? (
          <p className="tool-feedback--error"><CircleAlert size={16} aria-hidden="true" />{error}</p>
        ) : notice ? (
          <p className="tool-feedback--success"><Check size={16} aria-hidden="true" />{notice}</p>
        ) : (
          <p>所有转换都在浏览器本地完成，文本不会上传到服务器。</p>
        )}
      </div>
    </section>
  );
}