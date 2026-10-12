import { reportToolUsage } from "../../services/toolUsage";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  CircleAlert,
  Clipboard,
  Download,
  Eraser,
  FileJson,
  Minimize2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  getJsonStats,
  type JsonFormatMode,
  transformJson,
} from "./formatJson";

const STORAGE_KEY = "nova.json.input";

const sampleJson = JSON.stringify(
  {
    product: "Bocchi",
    tools: ["json", "image", "color", "qr"],
    favorites: 4,
    preferences: {
      theme: "light",
      compactMode: false,
    },
  },
  null,
  2,
);

export function JsonFormatter() {
  const [input, setInput] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileView, setMobileView] = useState<"input" | "output">("input");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const inputStats = useMemo(() => getJsonStats(input), [input]);
  const outputStats = useMemo(() => getJsonStats(output), [output]);

  useEffect(() => {
    try {
      if (input) window.localStorage.setItem(STORAGE_KEY, input);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Local draft storage is optional.
    }
  }, [input]);

  function processJson(mode: JsonFormatMode) {
    const result = transformJson(input, mode);

    if (!result.ok) {
      setOutput("");
      setNotice("");
      const location =
        result.line && result.column
          ? `第 ${result.line} 行，第 ${result.column} 列：`
          : "";
      setError(`${location}${result.message}`);
      inputRef.current?.focus();
      return;
    }

    setOutput(result.output);
    setError("");
    setNotice(mode === "pretty" ? "已格式化为 2 空格缩进。" : "已压缩为单行 JSON。");
    void reportToolUsage("json");
  }

  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setInput(event.target.value);
    setError("");
    setNotice("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      processJson("pretty");
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "m"
    ) {
      event.preventDefault();
      processJson("minify");
    }
  }

  async function copyOutput() {
    if (!output) return;

    setBusy(true);
    try {
      await navigator.clipboard.writeText(output);
      setNotice("结果已复制到剪贴板。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板，请手动选择输出内容。");
    } finally {
      setBusy(false);
    }
  }

  function downloadOutput() {
    if (!output) return;

    const blob = new Blob([output], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bocchi-formatted.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("文件已开始下载。");
  }

  function clearAll() {
    setInput("");
    setOutput("");
    setError("");
    setNotice("已清空当前内容。");
    inputRef.current?.focus();
  }

  function loadSample() {
    setInput(sampleJson);
    setOutput("");
    setError("");
    setNotice("示例 JSON 已载入。");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <section className="json-tool" aria-labelledby="json-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <FileJson size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="json-tool-title">JSON 格式化</h1>
          <p>验证、格式化、压缩并导出 JSON 文本。</p>
        </div>
      </header>

      <div className="json-toolbar" aria-label="JSON 工具操作">
        <button
          className="tool-button tool-button--primary"
          type="button"
          onClick={() => processJson("pretty")}
        >
          <WandSparkles size={17} strokeWidth={2} aria-hidden="true" />
          格式化
        </button>
        <button
          className="tool-button"
          type="button"
          onClick={() => processJson("minify")}
        >
          <Minimize2 size={17} strokeWidth={2} aria-hidden="true" />
          压缩
        </button>
        <button
          className="tool-button"
          type="button"
          onClick={copyOutput}
          disabled={!output || busy}
        >
          <Clipboard size={17} strokeWidth={2} aria-hidden="true" />
          复制结果
        </button>
        <button
          className="tool-button"
          type="button"
          onClick={downloadOutput}
          disabled={!output}
        >
          <Download size={17} strokeWidth={2} aria-hidden="true" />
          下载
        </button>
        <span className="json-toolbar__spacer" />
        <button className="tool-button" type="button" onClick={loadSample}>
          <Sparkles size={17} strokeWidth={2} aria-hidden="true" />
          载入示例
        </button>
        <button className="tool-button" type="button" onClick={clearAll}>
          <Eraser size={17} strokeWidth={2} aria-hidden="true" />
          清空
        </button>
      </div>

      <div className="mobile-tool-tabs json-mobile-tabs" aria-label="JSON 编辑区">
        <button className={mobileView === "input" ? "is-active" : ""} type="button" onClick={() => setMobileView("input")}>输入</button>
        <button className={mobileView === "output" ? "is-active" : ""} type="button" onClick={() => setMobileView("output")}>输出</button>
      </div>

      <div className={`json-editor-grid json-editor-grid--${mobileView}`}>
        <label className="json-panel">
          <span className="json-panel__header">
            <span>输入</span>
            <span>
              {inputStats.characters} 字符 / {inputStats.lines} 行
            </span>
          </span>
          <textarea
            ref={inputRef}
            className="json-textarea"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder='粘贴 JSON，例如：{"name":"Bocchi"}'
            spellCheck={false}
            aria-describedby={error ? "json-error" : notice ? "json-notice" : "json-shortcut-help"}
          />
        </label>

        <label className="json-panel">
          <span className="json-panel__header">
            <span>输出</span>
            <span>
              {outputStats.characters} 字符 / {outputStats.lines} 行
            </span>
          </span>
          <textarea
            className="json-textarea json-textarea--output"
            value={output}
            readOnly
            placeholder="格式化结果会显示在这里"
            spellCheck={false}
          />
        </label>
      </div>

      <div className="json-feedback" aria-live="polite">
        {error ? (
          <p className="json-feedback__error" id="json-error" role="alert">
            <CircleAlert size={17} strokeWidth={2} aria-hidden="true" />
            {error}
          </p>
        ) : notice ? (
          <p className="json-feedback__success" id="json-notice">
            <Check size={17} strokeWidth={2.2} aria-hidden="true" />
            {notice}
          </p>
        ) : (
          <p id="json-shortcut-help">
            快捷键：Ctrl/Command + Enter 格式化，Ctrl/Command + Shift + M 压缩。
          </p>
        )}
      </div>
    </section>
  );
}
