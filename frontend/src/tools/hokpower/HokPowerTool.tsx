import { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, Database, Search, Shield, Trophy } from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";

type ApiSource = "auto" | "xxoo" | "wzryqz" | "sapi";
type Hero = { ename: string; cname: string; title: string; iconUrl: string };
type Power = {
  uid: string; name: string; alias: string; platform: string; photo: string;
  province: string; provincePower: string; city: string; cityPower: string;
  area: string; areaPower: string; guobiao: string; updatetime: string;
};
type QueryResult = { source: string; sourceLabel: string; message: string; power: Power };

const sources: Array<{ value: ApiSource; label: string; detail: string }> = [
  { value: "auto", label: "自动选择", detail: "优先 XXOO，失败切换 SAPI" },
  { value: "xxoo", label: "XXOO API", detail: "茬欧 API 数据源" },
  { value: "wzryqz", label: "WZRYQZ API", detail: "国标 Top10/Top100 与地区门槛" },
  { value: "sapi", label: "SAPI.run", detail: "备用战力数据源" },
];
const platforms = [
  { value: "aqq", label: "安卓 QQ" }, { value: "iqq", label: "iOS QQ" },
  { value: "awx", label: "安卓微信" }, { value: "iwx", label: "iOS 微信" },
];
const SOURCE_KEY = "nova.hokpower.source";

export function HokPowerTool() {
  const [source, setSource] = useState<ApiSource>(() => { const stored = localStorage.getItem(SOURCE_KEY); return stored === "xxoo" || stored === "wzryqz" || stored === "sapi" ? stored : "auto"; });
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [hero, setHero] = useState("");
  const [heroType, setHeroType] = useState("aqq");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [heroSource, setHeroSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const filteredHeroes = useMemo(() => { const keyword = hero.trim().toLowerCase(); if (!keyword) return heroes.slice(0, 80); return heroes.filter((item) => item.cname.toLowerCase().includes(keyword) || item.ename.includes(keyword)).slice(0, 80); }, [hero, heroes]);

  useEffect(() => {
    let active = true; setLoading(true); setError("");
    fetch(`/api/tools/hok-power/heroes?source=${source}`)
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message || "英雄列表加载失败"); return payload; })
      .then((payload) => { if (!active) return; setHeroes(payload.heroes || []); setHeroSource(payload.sourceLabel || ""); setHero((current) => current || payload.heroes?.[0]?.cname || ""); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "英雄列表加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [source]);

  function changeSource(next: ApiSource) { setSource(next); setResult(null); setNotice(""); localStorage.setItem(SOURCE_KEY, next); }
  async function query() {
    if (!hero.trim()) { setError("请选择或输入英雄名称。"); return; }
    setLoading(true); setError(""); setNotice("");
    try {
      const params = new URLSearchParams({ hero: hero.trim(), type: heroType, source });
      const response = await fetch(`/api/tools/hok-power/query?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "战力查询失败");
      setResult(payload);
      setNotice(source === "auto" ? (payload.source === "xxoo" ? "已使用 XXOO API。" : `XXOO 不可用，已自动切换到 ${payload.sourceLabel}。`) : `已使用 ${payload.sourceLabel}。`);
      void reportToolUsage("hokpower");
    } catch (reason) { setResult(null); setError(reason instanceof Error ? reason.message : "战力查询失败"); }
    finally { setLoading(false); }
  }  return (
    <section className="hokpower-tool" aria-labelledby="hokpower-title">
      <header className="tool-heading"><div className="tool-heading__icon"><Trophy size={25} /></div><div><h1 id="hokpower-title">王者荣耀最低战力查询</h1><p>查询英雄在区、市、省和国服榜单的战力参考。</p></div></header>
      <section className="hokpower-source-panel">
        <header><div><strong>数据接口</strong><small>可切换数据源，自动模式会优先使用主接口</small></div><Database size={18} /></header>
        <div className="hokpower-source-grid">{sources.map((item) => <button className={source === item.value ? "is-active" : ""} key={item.value} type="button" onClick={() => changeSource(item.value)}><strong>{item.label}</strong><small>{item.detail}</small>{source === item.value && <Check size={15} />}</button>)}</div>
      </section>
      <section className="hokpower-query-panel">
        <label className="hokpower-hero-field"><span>英雄名称</span><div><Search size={17} /><input list="hokpower-heroes" value={hero} onChange={(event) => { setHero(event.target.value); setResult(null); }} onKeyDown={(event) => { if (event.key === "Enter") void query(); }} placeholder="输入英雄名，例如：孙悟空" /><datalist id="hokpower-heroes">{heroes.map((item) => <option key={item.ename} value={item.cname}>{item.title}</option>)}</datalist></div></label>
        <div className="hokpower-platform"><span>区服</span><div>{platforms.map((item) => <button className={heroType === item.value ? "is-active" : ""} key={item.value} type="button" onClick={() => setHeroType(item.value)}>{item.label}</button>)}</div></div>
        <button className="tool-button tool-button--primary hokpower-submit" type="button" onClick={() => void query()} disabled={loading}><Trophy size={17} />{loading ? "查询中…" : "查询最低战力"}</button>
      </section>
      {filteredHeroes.length > 0 && hero && !heroes.some((item) => item.cname === hero) && <div className="hokpower-suggestions">{filteredHeroes.slice(0, 12).map((item) => <button key={item.ename} type="button" onClick={() => { setHero(item.cname); setResult(null); }}><img src={item.iconUrl} alt="" /><span><strong>{item.cname}</strong><small>{item.title}</small></span></button>)}</div>}
      {heroSource && <p className="hokpower-source-status">英雄列表来源：{heroSource}</p>}
      {result ? (
        <section className="hokpower-result">
          <header><img src={result.power.photo} alt="" /><div><small>{result.power.platform}</small><h2>{result.power.name}</h2><p>{result.power.alias}</p></div><span>数据源：{result.sourceLabel}</span></header>
          <div className="hokpower-power-grid">
            <article className="is-national"><span>国标战力</span><strong>{result.power.guobiao || "暂无"}</strong><small>全国榜单参考</small></article>
            <article><span>省级 · {result.power.province || "暂无"}</span><strong>{result.power.provincePower || "暂无"}</strong><small>省级上榜参考</small></article>
            <article><span>市级 · {result.power.city || "暂无"}</span><strong>{result.power.cityPower || "暂无"}</strong><small>市级上榜参考</small></article>
            <article><span>区级 · {result.power.area || "暂无"}</span><strong>{result.power.areaPower || "暂无"}</strong><small>区县上榜参考</small></article>
          </div>
          <footer><Shield size={15} />数据更新时间：{result.power.updatetime || "未知"} · {result.sourceLabel}</footer>
        </section>
      ) : <div className="hokpower-empty"><Trophy size={36} /><strong>等待查询</strong><p>输入英雄并选择区服后查询最低战力参考。</p></div>}
      <div className="tool-feedback">{error ? <p className="tool-feedback--error"><CircleAlert size={16} />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} />{notice}</p> : <p>数据来自第三方公开接口，仅供查询参考。</p>}</div>
    </section>
  );
}