import { reportToolUsage } from "../../services/toolUsage";
import { useMemo, useState } from "react";
import { Check, Clipboard, Eraser, Type } from "lucide-react";
import { convertText, getTextStyles } from "./convertText";

const styles = getTextStyles();
const FONT_SIZES = [18, 22, 26, 32, 38];

export function TextConvertTool() {
  const [input, setInput] = useState("Bocchi 工具台 2026");
  const [style, setStyle] = useState("bold");
  const [fontSize, setFontSize] = useState(28);
  const [notice, setNotice] = useState("");

  const output = useMemo(() => convertText(input, style), [input, style]);

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      void reportToolUsage("text");
      setNotice("转换结果已复制。");
    } catch {
      setNotice("浏览器没有允许访问剪贴板。");
    }
  }

  function clearText() {
    setInput("");
    setNotice("已清空输入。");
  }

  return (
    <section className="text-convert-tool" aria-labelledby="text-convert-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <Type size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="text-convert-title">文字转换</h1>
          <p>使用 Unicode 字符转换字体样式，适合昵称、简介和社交平台文案。</p>
        </div>
      </header>

      <div className="text-convert-layout">
        <section className="text-convert-input-panel">
          <label htmlFor="text-convert-input">输入文字</label>
          <textarea
            id="text-convert-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入要转换的文字"
          />
          <div className="text-input-actions">
            <span>{input.length} 个字符</span>
            <button type="button" onClick={clearText}>
              <Eraser size={15} aria-hidden="true" />
              清空
            </button>
          </div>
        </section>

        <section className="text-convert-preview">
          <header>
            <span>实时预览</span>
            <div className="font-size-control" aria-label="预览字号">
              {FONT_SIZES.map((size) => (
                <button
                  className={fontSize === size ? "is-active" : ""}
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </header>
          <div className="text-preview-box" style={{ fontSize: `${fontSize}px` }}>
            {output || "预览会显示在这里"}
          </div>
          <button className="tool-button tool-button--primary" type="button" onClick={copyOutput}>
            <Clipboard size={16} aria-hidden="true" />
            复制转换结果
          </button>
        </section>
      </div>

      <section className="font-style-section" aria-label="字体样式">
        <header>
          <span>选择字体样式</span>
          <small>{styles.length} 种样式</small>
        </header>
        <div className="font-style-grid">
          {styles.map((item) => (
            <button
              className={`font-style-card${style === item.cname ? " is-active" : ""}`}
              key={item.cname}
              type="button"
              onClick={() => setStyle(item.cname)}
            >
              <span>{item.name}</span>
              <strong>{convertText(input.slice(0, 30) || "Bocchi Text", item.cname)}</strong>
            </button>
          ))}
        </div>
      </section>

      <div className="text-convert-feedback" aria-live="polite">
        {notice && (
          <p>
            <Check size={16} aria-hidden="true" />
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}
