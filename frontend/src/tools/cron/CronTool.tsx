import { reportToolUsage } from "../../services/toolUsage";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  Clipboard,
  Play,
  RefreshCw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  buildCronExpression,
  createDefaultCronState,
  cronExamples,
  cronFieldDefinitions,
  cronFieldModes,
  cronTimezones,
  defaultValueForMode,
  formatCronDate,
  getNextCronRuns,
  parseCronExpression,
  type CronFieldKey,
  type CronFieldMode,
} from "./cronUtils";

export function CronTool() {
  const [builder, setBuilder] = useState(createDefaultCronState);
  const [activeField, setActiveField] = useState<CronFieldKey>("minute");
  const [expressionInput, setExpressionInput] = useState("0 0 9 * * ?");
  const [timezone, setTimezone] = useState("Asia/Shanghai");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const expression = useMemo(() => buildCronExpression(builder), [builder]);
  const nextRunResult = useMemo(() => {
    try {
      return { runs: getNextCronRuns(expression, timezone, 5), error: "" };
    } catch (reason) {
      return { runs: [], error: reason instanceof Error ? reason.message : "无法解析当前 Cron 表达式。" };
    }
  }, [expression, timezone]);

  function updateMode(mode: CronFieldMode) {
    setBuilder((current) => ({
      ...current,
      [activeField]: { mode, value: defaultValueForMode(activeField, mode) },
    }));
  }

  function updateValue(value: string) {
    setBuilder((current) => ({
      ...current,
      [activeField]: { ...current[activeField], value },
    }));
  }

  function parseInput() {
    try {
      const parsed = parseCronExpression(expressionInput);
      setBuilder(parsed);
      void reportToolUsage("cron");
      setNotice("表达式已解析到下方构建器。");
      setError("");
    } catch (reason) {
      setNotice("");
      setError(reason instanceof Error ? reason.message : "无法解析这个 Cron 表达式。");
    }
  }

  function loadExample(value: string) {
    setExpressionInput(value);
    try {
      setBuilder(parseCronExpression(value));
      void reportToolUsage("cron");
      setNotice("示例已载入。");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "示例解析失败。");
    }
  }

  function resetBuilder() {
    setBuilder(createDefaultCronState());
    setExpressionInput("* * * * * ?");
    setActiveField("minute");
    setNotice("已重置为每秒执行的表达式。");
    setError("");
  }

  async function copyExpression() {
    try {
      await navigator.clipboard.writeText(expression);
      setNotice("Cron 表达式已复制。");
      setError("");
    } catch {
      setError("浏览器没有允许访问剪贴板。");
    }
  }

  const currentField = builder[activeField];
  const activeDefinition = cronFieldDefinitions.find((item) => item.key === activeField) ?? cronFieldDefinitions[0];
  const valueDisabled = ["every", "noSpecific", "none"].includes(currentField.mode);
  const valueHint: Partial<Record<CronFieldMode, string>> = {
    specific: `填写一个值，例如 ${activeDefinition.hint}`,
    range: "使用 start-end，例如 9-18",
    interval: "使用 start/step，例如 0/5",
    list: "使用逗号分隔，例如 1,3,5",
    last: "L 表示最后一天",
    lastWeekday: "例如 5L 表示最后一个星期五",
    nthWeekday: "例如 1#2 表示第二个星期一",
    custom: "直接填写 Cron 字段内容",
  };

  return (
    <section className="cron-tool" aria-labelledby="cron-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <CalendarClock size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="cron-tool-title">Cron 表达式</h1>
          <p>可视化构建、解析 Cron，并预览未来 5 次执行时间。</p>
        </div>
      </header>

      <div className="cron-expression-bar">
        <input
          value={expressionInput}
          onChange={(event) => { setExpressionInput(event.target.value); setError(""); }}
          onKeyDown={(event) => { if (event.key === "Enter") parseInput(); }}
          placeholder="例如 0 0 9 * * ?"
          spellCheck={false}
          aria-label="输入 Cron 表达式"
        />
        <button className="tool-button tool-button--primary" type="button" onClick={parseInput}>
          <Play size={16} fill="currentColor" aria-hidden="true" />
          解析表达式
        </button>
        <label className="cron-timezone">
          <span>时区</span>
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            {cronTimezones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
      </div>

      <div className="cron-layout">
        <section className="cron-builder">
          <div className="cron-field-tabs" role="tablist" aria-label="Cron 字段">
            {cronFieldDefinitions.map((field) => (
              <button
                className={activeField === field.key ? "is-active" : ""}
                key={field.key}
                type="button"
                role="tab"
                aria-selected={activeField === field.key}
                onClick={() => setActiveField(field.key)}
              >
                {field.label}
              </button>
            ))}
          </div>

          <div className="cron-field-panel" role="tabpanel">
            <header>
              <div>
                <strong>{activeDefinition.label}字段</strong>
                <small>{activeDefinition.hint}</small>
              </div>
              <code>{builder[activeField].value || "(空)"}</code>
            </header>

            <div className="cron-mode-grid">
              {cronFieldModes[activeField].map((mode) => (
                <button
                  className={currentField.mode === mode.value ? "is-active" : ""}
                  key={mode.value}
                  type="button"
                  onClick={() => updateMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <label className="cron-value-field">
              <span>字段值</span>
              <input
                value={currentField.value}
                disabled={valueDisabled}
                onChange={(event) => updateValue(event.target.value)}
                placeholder={valueHint[currentField.mode] ?? "填写字段内容"}
                spellCheck={false}
              />
              <small>{valueHint[currentField.mode] ?? "直接填写 Cron 字段内容。"}</small>
            </label>
          </div>

          <div className="cron-examples">
            <span>常用示例</span>
            <div>
              {cronExamples.map((example) => (
                <button key={example.value} type="button" onClick={() => loadExample(example.value)}>
                  <Sparkles size={14} aria-hidden="true" />
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="cron-result">
          <div className="cron-expression-card">
            <header>
              <span>生成表达式</span>
              <button type="button" onClick={copyExpression} aria-label="复制 Cron 表达式">
                <Clipboard size={15} aria-hidden="true" />
              </button>
            </header>
            <code>{expression}</code>
            <div className="cron-expression-fields">
              {cronFieldDefinitions.map((field) => (
                <span key={field.key}>
                  <small>{field.label}</small>
                  <code>{field.key === "year" && builder.year.mode === "none" ? "—" : builder[field.key].value}</code>
                </span>
              ))}
            </div>
          </div>

          <div className="cron-next-runs">
            <header>
              <div>
                <strong>未来 5 次执行</strong>
                <small>{timezone}</small>
              </div>
              <button type="button" onClick={() => setExpressionInput(expression)} title="同步到解析输入">
                <RefreshCw size={15} aria-hidden="true" />
              </button>
            </header>

            {nextRunResult.error ? (
              <p className="cron-next-error">{nextRunResult.error}</p>
            ) : nextRunResult.runs.length ? (
              <ol>
                {nextRunResult.runs.map((run, index) => (
                  <li key={run.toISOString()}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <time dateTime={run.toISOString()}>{formatCronDate(run, timezone)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p>没有可预览的执行时间。</p>
            )}
          </div>

          <div className="cron-actions">
            <button className="tool-button" type="button" onClick={resetBuilder}>
              <WandSparkles size={17} strokeWidth={2} aria-hidden="true" />
              重置构建器
            </button>
          </div>
        </aside>
      </div>

      <div className="tool-feedback" aria-live="polite">
        {error ? (
          <p className="tool-feedback--error">{error}</p>
        ) : notice ? (
          <p className="tool-feedback--success">
            <Check size={16} strokeWidth={2.2} aria-hidden="true" />
            {notice}
          </p>
        ) : (
          <p>支持 5、6、7 段 Cron，默认按 7 段构建。</p>
        )}
      </div>
    </section>
  );
}
