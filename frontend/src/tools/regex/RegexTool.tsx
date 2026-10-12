import { useMemo, useState } from "react";
import { Check, CircleAlert, Clipboard, Replace, Search, WholeWord } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { replaceRegex, runRegex } from "./regexUtils";

export function RegexTool() {
  const [pattern, setPattern] = useState("\\b[A-Z][a-z]+\\b");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Bocchi makes small tools. JSON and URL are useful.");
  const [replacement, setReplacement] = useState("[match]");
  const [replaced, setReplaced] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const result = useMemo(() => runRegex(pattern, flags, text), [pattern, flags, text]);

  function executeReplace() {
    try {
      const next = replaceRegex(pattern, flags, text, replacement);
      setReplaced(next);
      setError("");
      setNotice("替换预览已生成。");
      void reportToolUsage("regex");
    } catch (reason) {
      setReplaced("");
      setNotice("");
      setError(reason instanceof Error ? reason.message : "正则替换失败。");
    }
  }

  async function copyMatches() {
    if (!result.matches.length) return;
    try {
      await navigator.clipboard.writeText(result.matches.map((match) => match.value).join("\n"));
      setNotice("匹配结果已复制。");
      setError("");
      void reportToolUsage("regex");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  return (
    <section className="regex-tool" aria-labelledby="regex-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><Search size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="regex-tool-title">正则测试器</h1><p>实时测试表达式、查看分组，并预览全局替换结果。</p></div>
      </header>

      <div className="regex-pattern-bar">
        <span>/</span>
        <input value={pattern} onChange={(event) => { setPattern(event.target.value); setNotice(""); setError(""); }} spellCheck={false} placeholder="输入正则表达式" />
        <span>/</span>
        <input className="regex-flags" value={flags} onChange={(event) => setFlags(event.target.value)} maxLength={8} aria-label="正则 flags" />
      </div>

      <div className="regex-flag-row">
        {["g", "i", "m", "s", "u"].map((flag) => (
          <button className={flags.includes(flag) ? "is-active" : ""} key={flag} type="button" onClick={() => setFlags((current) => current.includes(flag) ? current.replace(flag, "") : `${current}${flag}`)}>{flag}</button>
        ))}
        <span><WholeWord size={14} />{result.matches.length} 个匹配</span>
      </div>

      <div className="regex-workbench">
        <section className="regex-editor-panel">
          <header><span>测试文本</span><small>{text.length} 字符</small></header>
          <textarea value={text} onChange={(event) => { setText(event.target.value); setReplaced(""); setNotice(""); setError(""); }} spellCheck={false} />
        </section>
        <section className="regex-match-panel">
          <header><span>匹配结果</span><button type="button" onClick={() => void copyMatches()} disabled={!result.matches.length}><Clipboard size={14} />复制</button></header>
          {result.error ? <p className="regex-error">{result.error}</p> : result.matches.length ? (
            <div className="regex-match-list">
              {result.matches.map((match, index) => (
                <div key={`${match.index}-${index}`}><span>#{index + 1}</span><code>{match.value || "(空匹配)"}</code><small>位置 {match.index}{match.groups.length ? ` · 分组 ${match.groups.length}` : ""}</small></div>
              ))}
            </div>
          ) : <p className="regex-empty">当前表达式没有匹配内容。</p>}
        </section>
      </div>

      <section className="regex-replace-panel">
        <header><Replace size={16} /><span>替换预览</span></header>
        <div><input value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="替换内容，支持 $1 分组" /><button className="tool-button tool-button--primary" type="button" onClick={executeReplace} disabled={!pattern}>执行替换</button></div>
        <pre>{replaced || "替换结果会显示在这里"}</pre>
      </section>

      <div className="tool-feedback">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>匹配过程在浏览器本地完成，最多显示 5000 个结果。</p>}
      </div>
    </section>
  );
}