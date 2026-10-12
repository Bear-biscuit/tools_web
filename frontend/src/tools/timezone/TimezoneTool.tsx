import { useMemo, useState } from "react";
import { Check, CircleAlert, Clock3, Globe2, Plus, Trash2 } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { buildMeetingTimes, type ZonedTime } from "./timezoneUtils";

const zoneOptions = [
  { zone: "Asia/Shanghai", label: "上海" },
  { zone: "Asia/Tokyo", label: "东京" },
  { zone: "Europe/London", label: "伦敦" },
  { zone: "Europe/Paris", label: "巴黎" },
  { zone: "America/New_York", label: "纽约" },
  { zone: "America/Los_Angeles", label: "洛杉矶" },
  { zone: "UTC", label: "UTC" },
];

function localInputValue() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function TimezoneTool() {
  const [baseTime, setBaseTime] = useState(localInputValue);
  const [baseTimeZone, setBaseTimeZone] = useState("Asia/Shanghai");
  const [zones, setZones] = useState(["Asia/Shanghai", "Europe/London", "America/New_York"]);
  const [results, setResults] = useState<ZonedTime[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const availableZones = useMemo(() => zoneOptions.filter((item) => !zones.includes(item.zone)), [zones]);

  function calculate() {
    const date = new Date(baseTime);
    if (Number.isNaN(date.getTime())) { setError("请选择有效时间。"); return; }
    setResults(buildMeetingTimes(date, zones, baseTimeZone));
    setNotice("已按所选时区计算会议时间。");
    setError("");
    void reportToolUsage("timezone");
  }

  function addZone() {
    const next = availableZones[0]?.zone;
    if (next) setZones((current) => [...current, next]);
  }  return (
    <section className="timezone-tool" aria-labelledby="timezone-tool-title">
      <header className="tool-heading"><div className="tool-heading__icon"><Globe2 size={25} /></div><div><h1 id="timezone-tool-title">时区会议规划</h1><p>输入一个时间，同时查看多个城市的当地时间和日期偏移。</p></div></header>
      <div className="timezone-controls">
        <label><span>基准时间</span><input type="datetime-local" value={baseTime} onChange={(event) => { setBaseTime(event.target.value); setResults([]); }} /></label>
        <label><span>基准时区</span><select value={baseTimeZone} onChange={(event) => setBaseTimeZone(event.target.value)}>{zoneOptions.map((item) => <option key={item.zone} value={item.zone}>{item.label} · {item.zone}</option>)}</select></label>
        <button className="tool-button tool-button--primary" type="button" onClick={calculate}><Clock3 size={16} />计算会议时间</button>
      </div>
      <div className="timezone-zones">
        <div>{zones.map((zone) => { const label = zoneOptions.find((item) => item.zone === zone)?.label ?? zone; return <span key={zone}>{label}<button type="button" onClick={() => setZones((current) => current.filter((item) => item !== zone))} aria-label={`删除 ${label}`}><Trash2 size={13} /></button></span>; })}</div>
        {availableZones.length > 0 && <button type="button" onClick={addZone}><Plus size={14} />添加时区</button>}
      </div>
      {results.length ? (
        <div className="timezone-results">{results.map((item) => <article key={item.timeZone}><div><strong>{zoneOptions.find((option) => option.zone === item.timeZone)?.label ?? item.timeZone}</strong><small>{item.timeZone}</small></div><span>{item.formatted}</span><em>{item.weekday}{item.dayOffset !== 0 ? ` · ${item.dayOffset > 0 ? "次日" : "前一日"}` : ""}</em></article>)}</div>
      ) : (
        <div className="timezone-empty"><Globe2 size={32} /><strong>还没有会议时间</strong><p>选择时间和城市后点击计算。</p></div>
      )}
      <div className="tool-feedback">{error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>时区换算由浏览器本地完成，不使用服务器时间。</p>}</div>
    </section>
  );
}