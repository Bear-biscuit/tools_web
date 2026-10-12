import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock4, Copy, Radio, RefreshCw } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import {
  getTimestampDetails,
  parseDateTimeLocal,
  parseTimestampInput,
  toDateTimeLocalValue,
} from "./timestampUtils";

type ResultRow = {
  label: string;
  value: string;
};

export function TimestampTool() {
  const [now, setNow] = useState(Date.now);
  const [timestampInput, setTimestampInput] = useState(() => String(Math.trunc(Date.now() / 1000)));
  const [parsedMilliseconds, setParsedMilliseconds] = useState<number | null>(null);
  const [dateInput, setDateInput] = useState(() => toDateTimeLocalValue(Date.now()));
  const [dateMilliseconds, setDateMilliseconds] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nowDetails = useMemo(() => getTimestampDetails(now), [now]);
  const parsedDetails = useMemo(
    () => parsedMilliseconds === null ? null : getTimestampDetails(parsedMilliseconds),
    [parsedMilliseconds],
  );
  const dateDetails = useMemo(
    () => dateMilliseconds === null ? null : getTimestampDetails(dateMilliseconds),
    [dateMilliseconds],
  );

  const parsedRows: ResultRow[] = parsedDetails ? [
    { label: "本地时间", value: parsedDetails.local },
    { label: "UTC 时间", value: parsedDetails.utc },
    { label: "ISO 8601", value: parsedDetails.iso },
    { label: "相对现在", value: parsedDetails.relative },
  ] : [];

  const dateRows: ResultRow[] = dateDetails ? [
    { label: "Unix 秒", value: dateDetails.seconds },
    { label: "Unix 毫秒", value: dateDetails.milliseconds },
    { label: "ISO 8601", value: dateDetails.iso },
  ] : [];

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label}已复制。`);
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
      setNotice("");
    }
  }

  function loadNow() {
    const next = Date.now();
    setTimestampInput(String(Math.trunc(next / 1000)));
    setDateInput(toDateTimeLocalValue(next));
    setNotice("已载入当前时间。");
    setError("");
  }

  function convertTimestamp() {
    try {
      const parsed = parseTimestampInput(timestampInput);
      setParsedMilliseconds(parsed.milliseconds);
      setError("");
      setNotice(`已按${parsed.unit === "seconds" ? "秒" : "毫秒"}时间戳转换。`);
      void reportToolUsage("timestamp");
    } catch (reason) {
      setParsedMilliseconds(null);
      setNotice("");
      setError(reason instanceof Error ? reason.message : "时间戳转换失败。");
    }
  }

  function convertDate() {
    try {
      const milliseconds = parseDateTimeLocal(dateInput);
      setDateMilliseconds(milliseconds);
      setError("");
      setNotice("日期已转换为时间戳。");
      void reportToolUsage("timestamp");
    } catch (reason) {
      setDateMilliseconds(null);
      setNotice("");
      setError(reason instanceof Error ? reason.message : "日期转换失败。");
    }
  }
  return (
    <section className="timestamp-tool" aria-labelledby="timestamp-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <Clock4 size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="timestamp-tool-title">时间戳转换器</h1>
          <p>在 Unix 秒、毫秒、本地时间、UTC 和 ISO 8601 之间转换。</p>
        </div>
      </header>

      <section className="timestamp-now" aria-label="当前时间">
        <div className="timestamp-now__signal">
          <span className="timestamp-live-dot" aria-hidden="true" />
          <span>当前时间</span>
          <Radio size={15} aria-hidden="true" />
        </div>
        <div className="timestamp-now__primary">
          <strong>{nowDetails.seconds}</strong>
          <span>Unix 秒</span>
        </div>
        <div className="timestamp-now__details">
          <span><small>毫秒</small><code>{nowDetails.milliseconds}</code></span>
          <span><small>本地</small><code>{nowDetails.local}</code></span>
          <span><small>UTC</small><code>{nowDetails.utc}</code></span>
          <span><small>相对</small><code>{nowDetails.relative}</code></span>
        </div>
        <div className="timestamp-now__actions">
          <button type="button" onClick={() => void copyValue(nowDetails.seconds, "当前秒时间戳")}><Copy size={15} aria-hidden="true" />复制秒</button>
          <button type="button" onClick={() => void copyValue(nowDetails.iso, "ISO 时间")}><Copy size={15} aria-hidden="true" />复制 ISO</button>
          <button type="button" onClick={loadNow}><RefreshCw size={15} aria-hidden="true" />载入当前时间</button>
        </div>
      </section>

      <div className="timestamp-convert-grid">
        <section className="timestamp-panel" aria-labelledby="timestamp-to-date-title">
          <header>
            <div>
              <h2 id="timestamp-to-date-title">时间戳 → 日期</h2>
              <p>自动识别 10 位秒时间戳和 13 位毫秒时间戳。</p>
            </div>
            <Clock4 size={21} strokeWidth={1.8} aria-hidden="true" />
          </header>

          <div className="timestamp-input-row">
            <label>
              <span>时间戳</span>
              <input
                value={timestampInput}
                onChange={(event) => setTimestampInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") convertTimestamp(); }}
                inputMode="numeric"
                spellCheck={false}
                placeholder="例如 1700000000"
              />
            </label>
            <button className="tool-button tool-button--primary" type="button" onClick={convertTimestamp}>转换</button>
          </div>

          {parsedDetails ? (
            <div className="timestamp-results">
              {parsedRows.map((row) => (
                <button key={row.label} type="button" onClick={() => void copyValue(row.value, row.label)}>
                  <span>{row.label}</span>
                  <code>{row.value}</code>
                  <Copy size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <p className="timestamp-empty">输入时间戳后点击转换，结果会显示在这里。</p>
          )}
        </section>
        <section className="timestamp-panel" aria-labelledby="date-to-timestamp-title">
          <header>
            <div>
              <h2 id="date-to-timestamp-title">日期 → 时间戳</h2>
              <p>按当前设备的本地时区计算。</p>
            </div>
            <CalendarDays size={21} strokeWidth={1.8} aria-hidden="true" />
          </header>

          <div className="timestamp-date-field">
            <label>
              <span>日期和时间</span>
              <input
                type="datetime-local"
                step="1"
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
              />
            </label>
            <button className="tool-button tool-button--primary" type="button" onClick={convertDate}>计算时间戳</button>
          </div>

          {dateDetails ? (
            <div className="timestamp-results">
              {dateRows.map((row) => (
                <button key={row.label} type="button" onClick={() => void copyValue(row.value, row.label)}>
                  <span>{row.label}</span>
                  <code>{row.value}</code>
                  <Copy size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <p className="timestamp-empty">选择日期后计算，秒和毫秒时间戳会同时显示。</p>
          )}
        </section>
      </div>

      <div className="tool-feedback" aria-live="polite">
        {error ? <p className="tool-feedback--error">{error}</p> : notice ? <p className="tool-feedback--success">{notice}</p> : <p>支持标准时间戳、ISO 日期和本地日期时间。</p>}
      </div>
    </section>
  );
}