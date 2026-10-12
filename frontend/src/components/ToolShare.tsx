import { useState } from "react";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import type { AuthSession } from "../services/auth";
import { createShare, type ShareKind } from "../services/share";

type ToolShareProps = {
  kind: ShareKind;
  session: AuthSession | null;
  getContent: () => string | Promise<string>;
  defaultTitle: string;
};

export function ToolShare({ kind, session, getContent, defaultTitle }: ToolShareProps) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleShare() {
    const content = (await getContent()).trim();
    if (!content) {
      setError("还没有可分享的内容。");
      return;
    }

    setBusy(true);
    setError("");
    setUrl("");
    setCopied(false);
    try {
      const result = await createShare(kind, defaultTitle, content, session);
      setUrl(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "分享失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("浏览器不允许复制，请手动选择链接复制。");
    }
  }

  return (
    <div className="tool-share">
      <button className="tool-button" type="button" onClick={handleShare} disabled={busy}>
        <Link2 size={15} aria-hidden="true" />
        {busy ? "生成中…" : "分享链接"}
      </button>

      {url && (
        <div className="tool-share__result">
          <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} aria-label="分享链接" />
          <button className="tool-button" type="button" onClick={handleCopy}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copied ? "已复制" : "复制"}
          </button>
          <a className="tool-button" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={15} aria-hidden="true" />
            打开
          </a>
        </div>
      )}

      {error && <span className="tool-share__error">{error}</span>}
    </div>
  );
}