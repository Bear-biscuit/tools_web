import { useMemo, useState } from "react";
import {
  Check,
  CircleAlert,
  Clipboard,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { reportToolUsage } from "../../services/toolUsage";
import {
  calculateEntropyBits,
  defaultPasswordOptions,
  generatePassword,
  getPasswordStrength,
  type PasswordOptions,
} from "./passwordUtils";

const presets = [
  { id: "easy", label: "易输入", detail: "16 位，排除易混字符", options: { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: false, excludeAmbiguous: true } },
  { id: "balanced", label: "平衡", detail: "20 位，符号与字符全开", options: { length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeAmbiguous: true } },
  { id: "strong", label: "高强度", detail: "32 位，最大化字符池", options: { length: 32, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeAmbiguous: false } },
] satisfies Array<{ id: string; label: string; detail: string; options: PasswordOptions }>;

export function PasswordGeneratorTool() {
  const [options, setOptions] = useState<PasswordOptions>(defaultPasswordOptions);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const entropyBits = useMemo(() => calculateEntropyBits(options.length, options), [options]);
  const strength = getPasswordStrength(entropyBits);

  function clearResult(message: string) {
    setPassword("");
    setNotice(message);
    setError("");
  }

  function toggleCharacterSet(key: "uppercase" | "lowercase" | "numbers" | "symbols") {
    const next = { ...options, [key]: !options[key] };
    if (![next.uppercase, next.lowercase, next.numbers, next.symbols].some(Boolean)) {
      setError("至少保留一种字符类型。");
      return;
    }
    setOptions(next);
    clearResult("选项已更新，重新生成后生效。");
  }

  function updateLength(length: number) {
    setOptions((current) => ({ ...current, length }));
    clearResult("长度已更新，重新生成后生效。");
  }

  function applyPreset(preset: PasswordOptions) {
    setOptions(preset);
    clearResult(`${preset.length} 位预设已应用，重新生成后生效。`);
  }

  function generate() {
    try {
      const next = generatePassword(options);
      setPassword(next);
      setNotice("新密码已生成。");
      setError("");
      void reportToolUsage("password");
    } catch (reason) {
      setPassword("");
      setNotice("");
      setError(reason instanceof Error ? reason.message : "密码生成失败。");
    }
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setNotice("密码已复制。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
      setNotice("");
    }
  }
  return (
    <section className="password-tool" aria-labelledby="password-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <KeyRound size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="password-tool-title">密码生成器</h1>
          <p>在浏览器本地生成随机密码，并查看字符池估算强度。</p>
        </div>
      </header>

      <section className="password-stage">
        <div className="password-stage__heading">
          <span><ShieldCheck size={17} aria-hidden="true" />本地生成，不上传密码</span>
          <small>{options.length} 位 · 约 {entropyBits} bit 熵</small>
        </div>
        <output className={`password-output${password ? " has-value" : ""}`} aria-live="polite">
          {password || "点击生成密码"}
        </output>
        <div className={`password-strength is-${password ? strength.key : "preview"}`}>
          <div className="password-strength__track" aria-hidden="true">
            {[1, 2, 3, 4].map((segment) => <span key={segment} className={segment <= strength.score ? "is-filled" : ""} />)}
          </div>
          <span>{password ? strength.label : "参数预览"} · {entropyBits} bit</span>
        </div>
        <div className="password-stage__actions">
          <button className="tool-button tool-button--primary" type="button" onClick={generate}>
            <Sparkles size={16} aria-hidden="true" />生成密码
          </button>
          <button className="tool-button" type="button" onClick={() => void copyPassword()} disabled={!password}>
            <Clipboard size={16} aria-hidden="true" />复制密码
          </button>
        </div>
      </section>

      <div className="password-controls-grid">
        <section className="password-control-panel">
          <header>
            <div><strong>密码长度</strong><small>推荐至少 16 位</small></div>
            <output>{options.length}</output>
          </header>
          <input
            type="range"
            min="8"
            max="64"
            value={options.length}
            onChange={(event) => updateLength(Number(event.target.value))}
            aria-label="密码长度"
          />
          <div className="password-length-scale" aria-hidden="true"><span>8</span><span>24</span><span>40</span><span>64</span></div>
        </section>

        <section className="password-control-panel">
          <header>
            <div><strong>字符类型</strong><small>每种启用的字符至少出现一次</small></div>
            <RefreshCw size={17} aria-hidden="true" />
          </header>
          <div className="password-character-grid">
            <button className={options.uppercase ? "is-active" : ""} type="button" onClick={() => toggleCharacterSet("uppercase")} aria-pressed={options.uppercase}><strong>A-Z</strong><span>大写字母</span></button>
            <button className={options.lowercase ? "is-active" : ""} type="button" onClick={() => toggleCharacterSet("lowercase")} aria-pressed={options.lowercase}><strong>a-z</strong><span>小写字母</span></button>
            <button className={options.numbers ? "is-active" : ""} type="button" onClick={() => toggleCharacterSet("numbers")} aria-pressed={options.numbers}><strong>0-9</strong><span>数字</span></button>
            <button className={options.symbols ? "is-active" : ""} type="button" onClick={() => toggleCharacterSet("symbols")} aria-pressed={options.symbols}><strong>#@!</strong><span>符号</span></button>
          </div>
          <button className={`password-ambiguous${options.excludeAmbiguous ? " is-active" : ""}`} type="button" onClick={() => { setOptions((current) => ({ ...current, excludeAmbiguous: !current.excludeAmbiguous })); clearResult("易混字符设置已更新。"); }} aria-pressed={options.excludeAmbiguous}>
            <Check size={15} aria-hidden="true" />排除 O、0、I、l、1 等易混字符
          </button>
        </section>
      </div>

      <section className="password-presets" aria-label="预设">
        <span>快速预设</span>
        <div>
          {presets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => applyPreset(preset.options)}>
              <strong>{preset.label}</strong>
              <small>{preset.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="tool-feedback" aria-live="polite">
        {error ? <p className="tool-feedback--error"><CircleAlert size={16} aria-hidden="true" />{error}</p> : notice ? <p className="tool-feedback--success"><Check size={16} aria-hidden="true" />{notice}</p> : <p>建议为不同网站使用不同密码，并通过密码管理器保存。</p>}
      </div>
    </section>
  );
}