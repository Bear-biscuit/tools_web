import { reportToolUsage } from "../../services/toolUsage";
import { getPreference, savePreference } from "../../services/account";
import type { AuthSession } from "../../services/auth";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  FileText,
  Files,
  History as HistoryIcon,
  PackageCheck,
  PackageOpen,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type Share = {
  code: string;
  kind: "text" | "file";
  name: string;
  mimeType: string;
  size: number;
  expireStyle: string;
  expireValue: number;
  createdAt: string;
  expiresAt: string | null;
  remainingDownloads: number | null;
  claimUrl: string;
};

type HistoryEntry = {
  id: string;
  action: "sent" | "received";
  code: string;
  itemKind: "text" | "file";
  name: string;
  size: number;
  createdAt: string;
  preview?: string;
};

type FileBoxStatus = {
  available: boolean;
  provider: string;
  activeItems: number;
  maxUploadBytes: number;
  maxTextBytes: number;
};

const HISTORY_KEY = "filebox.history";
const HISTORY_LIMIT = 50;

function createHistoryId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is HistoryEntry => {
    if (typeof entry !== "object" || entry === null) return false;
    const item = entry as Partial<HistoryEntry>;
    return (
      typeof item.id === "string" &&
      (item.action === "sent" || item.action === "received") &&
      typeof item.code === "string" &&
      (item.itemKind === "text" || item.itemKind === "file") &&
      typeof item.name === "string" &&
      typeof item.size === "number" &&
      typeof item.createdAt === "string"
    );
  }).slice(0, HISTORY_LIMIT);
}

const expireOptions = [
  { value: "minute", label: "分钟" },
  { value: "hour", label: "小时" },
  { value: "day", label: "天" },
  { value: "count", label: "次领取" },
  { value: "forever", label: "永久" },
] as const;

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message || "请求失败，请稍后重试。";
  } catch {
    return "请求失败，请稍后重试。";
  }
}

function describeExpiry(share: Share) {
  if (share.expireStyle === "forever") return "永久有效";
  if (share.expireStyle === "count") return `还可领取 ${share.remainingDownloads ?? 0} 次`;
  const labels: Record<string, string> = { minute: "分钟", hour: "小时", day: "天" };
  return `有效 ${share.expireValue} ${labels[share.expireStyle] ?? ""}`.trim();
}

type FileBoxToolProps = { session: AuthSession | null };

export function FileBoxTool({ session }: FileBoxToolProps) {
  const [mode, setMode] = useState<"send" | "receive" | "history">("send");
  const [sendKind, setSendKind] = useState<"text" | "file">("file");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expireStyle, setExpireStyle] = useState<(typeof expireOptions)[number]["value"]>("day");
  const [expireValue, setExpireValue] = useState(1);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<Share | null>(null);
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const [inspected, setInspected] = useState<Share | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [status, setStatus] = useState<FileBoxStatus | null>(null);
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clearArmed, setClearArmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    setClearArmed(false);
    getPreference<unknown>(HISTORY_KEY, session)
      .then((value) => { if (active) setHistory(normalizeHistory(value)); })
      .catch(() => { if (active) setHistory([]); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    fetch("/api/tools/filebox/status")
      .then((response) => response.json() as Promise<FileBoxStatus>)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  function storeHistory(next: HistoryEntry[]) {
    setHistory(next);
    setClearArmed(false);
    void savePreference(HISTORY_KEY, next, session).catch(() => {
      setError("历史记录保存失败，请稍后重试。");
    });
  }

  function appendHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
    const next = [{
      ...entry,
      id: createHistoryId(),
      createdAt: new Date().toISOString(),
    }, ...history].slice(0, HISTORY_LIMIT);
    storeHistory(next);
  }

  function fillPickupCode(code: string) {
    setMode("receive");
    setClearArmed(false);
    window.setTimeout(() => {
      if (pickupInputRef.current) pickupInputRef.current.value = code;
      pickupInputRef.current?.focus();
    }, 0);
  }

  function removeHistoryEntry(id: string) {
    storeHistory(history.filter((entry) => entry.id !== id));
  }

  function clearHistory() {
    if (!clearArmed) {
      setClearArmed(true);
      return;
    }
    storeHistory([]);
    setNotice("取件历史已清空。");
    setError("");
  }

  function formatHistoryTime(value: string) {
    return new Date(value).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function createShare() {
    setSending(true);
    setError("");
    setNotice("");
    try {
      let response: Response;
      if (sendKind === "text") {
        if (!text.trim()) throw new Error("请输入要寄送的文本。");
        response = await fetch("/api/tools/filebox/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, expireValue, expireStyle }),
        });
      } else {
        if (!file) throw new Error("请选择要寄送的文件。");
        const data = new FormData();
        data.append("file", file);
        data.append("expireValue", String(expireStyle === "forever" ? 0 : expireValue));
        data.append("expireStyle", expireStyle);
        response = await fetch("/api/tools/filebox/file", { method: "POST", body: data });
      }
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as { share: Share };
      setSendResult(payload.share);
      void reportToolUsage("filebox");
      setNotice(`寄件成功，取件码是 ${payload.share.code}。`);
      setStatus((current) => current ? { ...current, activeItems: current.activeItems + 1 } : current);
      appendHistory({
        action: "sent",
        code: payload.share.code,
        itemKind: payload.share.kind,
        name: payload.share.name,
        size: payload.share.size,
        preview: sendKind === "text" ? text.slice(0, 80) : undefined,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "寄件失败，请稍后重试。");
    } finally {
      setSending(false);
    }
  }

  async function inspectCode() {
    setError("");
    setNotice("");
    setPickupText("");
    const code = (pickupInputRef.current?.value ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    if (code.length !== 6) {
      setError("请输入完整的 6 位取件码。");
      return;
    }
    try {
      const response = await fetch("/api/tools/filebox/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as { share: Share };
      setInspected(payload.share);
    } catch (reason) {
      setInspected(null);
      setError(reason instanceof Error ? reason.message : "查询失败，请稍后重试。");
    }
  }

  async function claimShare() {
    if (!inspected) return;
    setClaiming(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(inspected.claimUrl);
      if (!response.ok) throw new Error(await readError(response));
      const contentType = response.headers.get("Content-Type") ?? "";
      let receivedPreview = "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as { share: { text?: string; name: string } };
        setPickupText(payload.share.text ?? "");
        receivedPreview = (payload.share.text ?? "").slice(0, 80);
        setNotice("文本已取件。");
      } else {
        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") ?? "";
        const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
        const fallback = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
        const downloadName = encoded ? decodeURIComponent(encoded) : fallback || inspected.name;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = downloadName;
        anchor.click();
        URL.revokeObjectURL(url);
        setNotice("文件已取件并开始下载。");
      }
      setInspected(null);
      appendHistory({
        action: "received",
        code: inspected.code,
        itemKind: inspected.kind,
        name: inspected.name,
        size: inspected.size,
        preview: receivedPreview || undefined,
      });
      if (pickupInputRef.current) pickupInputRef.current.value = "";
      void reportToolUsage("filebox");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "取件失败，请稍后重试。");
    } finally {
      setClaiming(false);
    }
  }

  async function copyTextContent(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setNotice("文本已复制。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setNotice(`取件码 ${code} 已复制。`);
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  return (
    <section className="filebox-tool" aria-labelledby="filebox-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <PackageOpen size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="filebox-tool-title">文件快递柜</h1>
          <p>寄送文本或文件，凭 6 位取件码在另一台设备领取。</p>
        </div>
      </header>

      <div className="filebox-statusbar">
        <span className="filebox-status-dot" aria-hidden="true" />
        <div>
          <strong>{status?.available ? "文件柜可用" : "正在连接文件柜"}</strong>
          <small>
            {status
              ? `单文件上限 ${formatBytes(status.maxUploadBytes)} · 当前库存 ${status.activeItems} 件`
              : "检查本地存储服务状态"}
          </small>
        </div>
        <ShieldCheck size={18} strokeWidth={1.9} aria-hidden="true" />
      </div>

      <div className="mobile-tool-tabs filebox-tabs" aria-label="文件快递柜功能">
        <button className={mode === "send" ? "is-active" : ""} type="button" onClick={() => setMode("send")}>
          <Send size={15} aria-hidden="true" />
          寄件
        </button>
        <button className={mode === "receive" ? "is-active" : ""} type="button" onClick={() => setMode("receive")}>
          <PackageCheck size={15} aria-hidden="true" />
          取件
        </button>
        <button className={mode === "history" ? "is-active" : ""} type="button" onClick={() => { setMode("history"); setClearArmed(false); }}>
          <HistoryIcon size={15} aria-hidden="true" />
          历史
        </button>
      </div>

      {mode === "send" ? (
        <div className="filebox-workbench">
          <section className="filebox-editor">
            <div className="filebox-kind-switch" aria-label="寄件类型">
              <button className={sendKind === "file" ? "is-active" : ""} type="button" onClick={() => setSendKind("file")}>
                <Files size={16} aria-hidden="true" />
                文件
              </button>
              <button className={sendKind === "text" ? "is-active" : ""} type="button" onClick={() => setSendKind("text")}>
                <FileText size={16} aria-hidden="true" />
                文本
              </button>
            </div>

            {sendKind === "file" ? (
              <label className={`filebox-dropzone${file ? " has-file" : ""}`} htmlFor="filebox-file-input">
                <Upload size={27} strokeWidth={1.8} aria-hidden="true" />
                <strong>{file ? file.name : "选择要寄送的文件"}</strong>
                <span>{file ? formatBytes(file.size) : "文件仅保存在 Bocchi 后端，不经过第三方网盘"}</span>
                <input
                  id="filebox-file-input"
                  className="visually-hidden"
                  type="file"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setSendResult(null);
                    event.target.value = "";
                  }}
                />
              </label>
            ) : (
              <label className="tool-field filebox-text-field">
                <span>寄送文本</span>
                <textarea
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setSendResult(null);
                  }}
                  placeholder="粘贴要寄送的文本或链接"
                  spellCheck={false}
                />
                <small>{new TextEncoder().encode(text).length} / {status?.maxTextBytes ?? 227328} 字节</small>
              </label>
            )}

            <div className="filebox-expiry">
              <span>有效期</span>
              <div>
                <input
                  type="number"
                  min="1"
                  max={expireStyle === "count" ? "100" : "365"}
                  value={expireValue}
                  disabled={expireStyle === "forever"}
                  onChange={(event) => setExpireValue(Math.max(1, Number(event.target.value) || 1))}
                  aria-label="有效期数值"
                />
                <select
                  value={expireStyle}
                  onChange={(event) => setExpireStyle(event.target.value as typeof expireStyle)}
                  aria-label="有效期类型"
                >
                  {expireOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="filebox-submit" type="button" onClick={createShare} disabled={sending}>
              <Send size={18} strokeWidth={2} aria-hidden="true" />
              {sending ? "正在寄件…" : "生成取件码"}
            </button>
          </section>
          <section className="filebox-result-panel" aria-live="polite">
            {sendResult ? (
              <>
                <span className="filebox-result-kicker">取件码</span>
                <strong className="filebox-code">{sendResult.code}</strong>
                <p>{sendResult.name} · {formatBytes(sendResult.size)} · {describeExpiry(sendResult)}</p>
                <button className="tool-button tool-button--primary" type="button" onClick={() => copyCode(sendResult.code)}>
                  <Clipboard size={17} strokeWidth={2} aria-hidden="true" />
                  复制取件码
                </button>
              </>
            ) : (
              <>
                <PackageOpen size={36} strokeWidth={1.6} aria-hidden="true" />
                <strong>取件码会显示在这里</strong>
                <p>寄件完成后，把 6 位取件码发给收件人即可。</p>
              </>
            )}
          </section>
        </div>
      ) : mode === "receive" ? (
        <div className="filebox-workbench filebox-workbench--pickup">
          <section className="filebox-pickup">
            <label className="tool-field">
              <span>输入 6 位取件码</span>
              <input
                className="filebox-code-input"
                ref={pickupInputRef}
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                enterKeyHint="search"
                maxLength={6}
                onChange={() => {
                  setInspected(null);
                  setPickupText("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void inspectCode();
                }}
                placeholder="例如 A7K9Q2"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button className="filebox-submit" type="button" onClick={inspectCode}>
              <PackageCheck size={18} strokeWidth={2} aria-hidden="true" />
              查询包裹
            </button>
          </section>

          <section className="filebox-result-panel filebox-result-panel--pickup" aria-live="polite">
            {pickupText ? (
              <>
                <div className="filebox-text-result">
                  <span>取件内容</span>
                  <button type="button" onClick={() => copyTextContent(pickupText)} aria-label="复制文本内容">
                    <Clipboard size={15} aria-hidden="true" />
                  </button>
                </div>
                <pre>{pickupText}</pre>
              </>
            ) : inspected ? (
              <>
                <span className="filebox-result-kicker">待取包裹</span>
                <strong>{inspected.name}</strong>
                <p>{formatBytes(inspected.size)} · {describeExpiry(inspected)}</p>
                <button className="filebox-submit" type="button" onClick={claimShare} disabled={claiming}>
                  {inspected.kind === "file" ? <Download size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
                  {claiming ? "正在取件…" : inspected.kind === "file" ? "取件并下载" : "取出文本"}
                </button>
              </>
            ) : (
              <>
                <PackageOpen size={36} strokeWidth={1.6} aria-hidden="true" />
                <strong>等待取件码</strong>
                <p>输入寄件人提供的取件码后，会先显示物品信息，确认后再领取。</p>
              </>
            )}
          </section>
        </div>
      ) : (
        <section className="filebox-history-panel">
          <header className="filebox-history-header">
            <div>
              <span>取件历史</span>
              <small>{session ? "已同步到账户" : "仅保存在本机"}</small>
            </div>
            {history.length > 0 && (
              <button className={clearArmed ? "is-armed" : ""} type="button" onClick={clearHistory}>
                <Trash2 size={15} aria-hidden="true" />
                {clearArmed ? "确认清空" : "清空记录"}
              </button>
            )}
          </header>

          {historyLoading ? (
            <div className="filebox-history-empty">
              <HistoryIcon size={28} strokeWidth={1.7} aria-hidden="true" />
              <strong>正在读取历史记录</strong>
            </div>
          ) : history.length ? (
            <div className="filebox-history-list">
              {history.map((entry) => (
                <article className="filebox-history-item" key={entry.id}>
                  <span className={`filebox-history-icon is-${entry.action}`}>
                    {entry.action === "sent" ? <Send size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
                  </span>
                  <div className="filebox-history-copy">
                    <div>
                      <strong>{entry.name}</strong>
                      <span className={`filebox-history-action is-${entry.action}`}>
                        {entry.action === "sent" ? "已寄件" : "已取件"}
                      </span>
                    </div>
                    {entry.preview && <p>{entry.preview}</p>}
                    <small>{formatHistoryTime(entry.createdAt)} · {formatBytes(entry.size)} · {entry.itemKind === "file" ? "文件" : "文本"}</small>
                  </div>
                  <div className="filebox-history-actions">
                    <button type="button" onClick={() => copyCode(entry.code)} aria-label={`复制取件码 ${entry.code}`}>
                      <code>{entry.code}</code>
                    </button>
                    {entry.action === "sent" && (
                      <button type="button" onClick={() => fillPickupCode(entry.code)} aria-label={`用取件码 ${entry.code} 取件`}>
                        取件
                      </button>
                    )}
                    <button type="button" onClick={() => removeHistoryEntry(entry.id)} aria-label="删除这条历史记录">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="filebox-history-empty">
              <HistoryIcon size={30} strokeWidth={1.6} aria-hidden="true" />
              <strong>还没有记录</strong>
              <p>寄件或取件成功后，记录会出现在这里。</p>
            </div>
          )}
        </section>
      )}

      <div className="filebox-privacy-note">
        <ShieldCheck size={17} strokeWidth={1.9} aria-hidden="true" />
        <span>本地部署存储 · 匿名取件 · 到期自动清理</span>
        <a href="https://github.com/vastsa/FileCodeBox" target="_blank" rel="noreferrer">
          参考项目 FileCodeBox
        </a>
      </div>

      <div className="tool-feedback" aria-live="polite">
        {error ? (
          <p className="tool-feedback--error">
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
            {error}
          </p>
        ) : notice ? (
          <p className="tool-feedback--success">
            <Check size={16} strokeWidth={2.2} aria-hidden="true" />
            {notice}
          </p>
        ) : null}
      </div>
    </section>
  );
}





