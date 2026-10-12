import { reportToolUsage } from "../../services/toolUsage";
import { useMemo, useState } from "react";
import { Check, Clipboard, Globe2, Search } from "lucide-react";
import countryListData from "../../data/countryList.json";

type Country = {
  name_zh: string;
  name_en: string;
  tel: string;
  pinyin: string;
  short_lower: string;
  short_upper: string;
};

const countries = countryListData as Country[];

function getFlagEmoji(code: string) {
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((character) => 127397 + character.charCodeAt(0)),
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function CountryCodeTool() {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const filteredCountries = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return countries;

    return countries.filter((country) =>
      [
        country.name_zh,
        country.name_en,
        country.pinyin,
        country.short_upper,
        country.tel,
      ].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [query]);

  async function copyCountryCode(country: Country, type: "dial" | "iso") {
    const value = type === "dial" ? `+${country.tel}` : country.short_upper;

    try {
      await copyText(value);
      void reportToolUsage("country");
      setNotice(`已复制 ${country.name_zh}：${value}`);
    } catch {
      setNotice("复制失败，请手动选择国家代码。");
    }
  }

  return (
    <section className="country-tool" aria-labelledby="country-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <Globe2 size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="country-tool-title">国家代码复制</h1>
          <p>按中文、英文、拼音或两位代码搜索，并复制国际区号。</p>
        </div>
      </header>

      <div className="country-search">
        <Search size={18} strokeWidth={1.9} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索国家、城市代码或区号，例如：中国、CN、86"
          aria-label="搜索国家代码"
        />
        <span>{filteredCountries.length} 个结果</span>
      </div>

      <div className="country-grid">
        {filteredCountries.map((country) => (
          <article className="country-card" key={country.short_upper}>
            <div className="country-card__flag" aria-hidden="true">
              {getFlagEmoji(country.short_upper)}
            </div>
            <div className="country-card__copy">
              <strong>{country.name_zh}</strong>
              <small>{country.name_en}</small>
              <span>
                <code>{country.short_upper}</code>
                <code>+{country.tel}</code>
              </span>
            </div>
            <div className="country-card__actions">
              <button type="button" onClick={() => copyCountryCode(country, "dial")}>
                <Clipboard size={14} aria-hidden="true" />
                复制区号
              </button>
              <button type="button" onClick={() => copyCountryCode(country, "iso")}>
                复制代码
              </button>
            </div>
          </article>
        ))}
      </div>

      {!filteredCountries.length && (
        <p className="country-empty">没有找到匹配的国家或地区。</p>
      )}

      <div className="country-feedback" aria-live="polite">
        {notice && (
          <p>
            <Check size={16} strokeWidth={2.2} aria-hidden="true" />
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}