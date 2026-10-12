import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, CircleAlert, Clipboard, Scale } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import { convertUnit, unitCategories, type UnitCategory } from "./unitUtils";

export function UnitConverterTool() {
  const [category, setCategory] = useState<UnitCategory>("length");
  const units = useMemo(() => Object.keys(unitCategories[category].units), [category]);
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("km");
  const [value, setValue] = useState("1");
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function switchCategory(next: UnitCategory) {
    const nextUnits = Object.keys(unitCategories[next].units);
    setCategory(next); setFrom(nextUnits[0]); setTo(nextUnits[1] ?? nextUnits[0]); setResult(""); setNotice(""); setError("");
  }

  function convert() {
    try {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) throw new Error("请输入有效数值。");
      const converted = convertUnit(category, numeric, from, to);
      setResult(Number(converted.toPrecision(10)).toString());
      setNotice("换算完成。"); setError(""); void reportToolUsage("units");
    } catch (reason) { setResult(""); setNotice(""); setError(reason instanceof Error ? reason.message : "单位换算失败。"); }
  }

  function swap() { setFrom(to); setTo(from); setResult(""); }
  async function copyResult() { if (!result) return; try { await navigator.clipboard.writeText(result); setNotice("结果已复制。"); } catch { setError("浏览器没有允许访问剪贴板。"); } }  return (
    <section className="units-tool" aria-labelledby="units-tool-title">
      <header className="tool-heading"><div className="tool-heading__icon"><Scale size={25} /></div><div><h1 id="units-tool-title">单位换算</h1><p>换算长度、重量、面积、体积、速度、数据量和温度。</p></div></header>
      <div className="units-categories">{Object.entries(unitCategories).map(([key, item]) => <button className={category === key ? "is-active" : ""} key={key} type="button" onClick={() => switchCategory(key as UnitCategory)}>{item.label}</button>)}</div>
      <div className="units-converter">
        <label><span>数值</span><input value={value} onChange={(event) => { setValue(event.target.value); setResult(""); }} inputMode="decimal" /></label>
        <label><span>从</span><select value={from} onChange={(event) => { setFrom(event.target.value); setResult(""); }}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
        <button className="units-swap" type="button" onClick={swap} aria-label="交换单位"><ArrowLeftRight size={18} /></button>
        <label><span>到</span><select value={to} onChange={(event) => { setTo(event.target.value); setResult(""); }}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
      </div>
      <div className="units-actions"><button className="tool-button tool-button--primary" type="button" onClick={convert}><ArrowLeftRight size={16} />执行换算</button><button className="tool-button" type="button" onClick={() => void copyResult()} disabled={!result}><Clipboard size={16} />复制结果</button></div>
      <div className="units-result"><span>换算结果</span><strong>{result ? `${result} ${to}` : "等待换算"}</strong></div>
      <div className="tool-feedback">{error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>换算在浏览器本地完成，结果保留约 10 位有效数字。</p>}</div>
    </section>
  );
}