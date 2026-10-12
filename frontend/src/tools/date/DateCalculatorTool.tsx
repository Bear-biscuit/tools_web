import { useState } from "react";
import { CalendarDays, Check, CircleAlert, RefreshCw } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { addDays, getDateDifference, toDateInputValue, type DateDifference } from "./dateUtils";

const today = toDateInputValue(new Date());

export function DateCalculatorTool() {
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 7));
  const [offset, setOffset] = useState(30);
  const [result, setResult] = useState<DateDifference | null>(null);
  const [shiftedDate, setShiftedDate] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function calculateDifference() {
    try {
      setResult(getDateDifference(start, end));
      setNotice("日期差已计算。");
      setError("");
      void reportToolUsage("date");
    } catch (reason) {
      setResult(null);
      setNotice("");
      setError(reason instanceof Error ? reason.message : "日期计算失败。");
    }
  }

  function calculateShift() {
    try {
      setShiftedDate(addDays(start, offset));
      setNotice("日期偏移已计算。");
      setError("");
      void reportToolUsage("date");
    } catch (reason) {
      setShiftedDate("");
      setNotice("");
      setError(reason instanceof Error ? reason.message : "日期偏移计算失败。");
    }
  }

  return (
    <section className="date-tool" aria-labelledby="date-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><CalendarDays size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="date-tool-title">日期计算器</h1><p>计算两个日期之间的天数、工作日和月数，或按天数向前向后偏移。</p></div>
      </header>

      <section className="date-range-panel">
        <div className="date-range-line" aria-hidden="true"><span /><i /><span /></div>
        <label><span>开始日期</span><input type="date" value={start} onChange={(event) => { setStart(event.target.value); setResult(null); setNotice(""); setError(""); }} /></label>
        <label><span>结束日期</span><input type="date" value={end} onChange={(event) => { setEnd(event.target.value); setResult(null); setNotice(""); setError(""); }} /></label>
        <button className="tool-button tool-button--primary" type="button" onClick={calculateDifference}><RefreshCw size={16} />计算日期差</button>
      </section>

      {result && (
        <section className="date-results" aria-live="polite">
          <article><span>总天数</span><strong>{result.days}</strong><small>天</small></article>
          <article><span>周数</span><strong>{result.weeks}</strong><small>周</small></article>
          <article><span>工作日</span><strong>{result.businessDays}</strong><small>排除周末</small></article>
          <article><span>完整月份</span><strong>{result.months}</strong><small>个月</small></article>
        </section>
      )}

      <section className="date-shift-panel">
        <header><div><strong>日期偏移</strong><small>使用开始日期作为基准</small></div><CalendarDays size={18} /></header>
        <div className="date-shift-controls">
          <label><span>偏移天数</span><input type="number" value={offset} onChange={(event) => setOffset(Number(event.target.value))} /></label>
          <button className="tool-button tool-button--primary" type="button" onClick={calculateShift}>计算偏移</button>
          {shiftedDate && <code>{shiftedDate}</code>}
        </div>
      </section>

      <div className="tool-feedback">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>工作日按周一至周五计算，暂不包含法定节假日。</p>}
      </div>
    </section>
  );
}