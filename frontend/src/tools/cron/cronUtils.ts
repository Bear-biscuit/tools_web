import { CronExpressionParser } from "cron-parser";

export type CronFieldKey = "second" | "minute" | "hour" | "day" | "month" | "weekday" | "year";
export type CronFieldMode =
  | "every"
  | "specific"
  | "range"
  | "interval"
  | "list"
  | "noSpecific"
  | "none"
  | "last"
  | "lastWeekday"
  | "nthWeekday"
  | "custom";
export type CronField = { mode: CronFieldMode; value: string };
export type CronBuilderState = Record<CronFieldKey, CronField>;

export const cronFieldDefinitions = [
  { key: "second", label: "秒", hint: "0-59" },
  { key: "minute", label: "分", hint: "0-59" },
  { key: "hour", label: "时", hint: "0-23" },
  { key: "day", label: "日", hint: "1-31" },
  { key: "month", label: "月", hint: "1-12" },
  { key: "weekday", label: "周", hint: "0-6" },
  { key: "year", label: "年", hint: "可留空" },
] as const;

function modeLabel(mode: CronFieldMode) {
  return {
    every: "每", specific: "指定", range: "范围", interval: "间隔", list: "多个",
    noSpecific: "不限", none: "留空", last: "最后一天", lastWeekday: "最后一天",
    nthWeekday: "第几个", custom: "自定义",
  }[mode];
}

export const cronFieldModes: Record<CronFieldKey, Array<{ value: CronFieldMode; label: string }>> = {
  second: ["every", "specific", "range", "interval", "list", "custom"].map((value) => ({ value: value as CronFieldMode, label: modeLabel(value as CronFieldMode) })),
  minute: ["every", "specific", "range", "interval", "list", "custom"].map((value) => ({ value: value as CronFieldMode, label: modeLabel(value as CronFieldMode) })),
  hour: ["every", "specific", "range", "interval", "list", "custom"].map((value) => ({ value: value as CronFieldMode, label: modeLabel(value as CronFieldMode) })),
  day: ["every", "noSpecific", "specific", "range", "interval", "list", "last", "custom"].map((value) => ({ value: value as CronFieldMode, label: modeLabel(value as CronFieldMode) })),
  month: ["every", "specific", "range", "interval", "list", "custom"].map((value) => ({ value: value as CronFieldMode, label: modeLabel(value as CronFieldMode) })),
  weekday: ["noSpecific", "every", "specific", "range", "interval", "list", "lastWeekday", "nthWeekday", "custom"].map((value) => ({ value: value as CronFieldMode, label: modeLabel(value as CronFieldMode) })),
  year: ["none", "every", "specific", "range", "interval", "list", "custom"].map((value) => ({ value: value as CronFieldMode, label: modeLabel(value as CronFieldMode) })),
};

export function createDefaultCronState(): CronBuilderState {
  return {
    second: { mode: "every", value: "*" },
    minute: { mode: "every", value: "*" },
    hour: { mode: "every", value: "*" },
    day: { mode: "every", value: "*" },
    month: { mode: "every", value: "*" },
    weekday: { mode: "noSpecific", value: "?" },
    year: { mode: "none", value: "" },
  };
}

export function defaultValueForMode(key: CronFieldKey, mode: CronFieldMode) {
  if (mode === "every") return "*";
  if (mode === "noSpecific") return "?";
  if (mode === "none") return "";
  if (mode === "last") return "L";
  if (mode === "lastWeekday") return "5L";
  if (mode === "nthWeekday") return "1#1";
  if (key === "year") return String(new Date().getFullYear());
  if (key === "day" || key === "month") return "1";
  if (key === "weekday") return "1";
  return "0";
}

function renderCronField(field: CronField) {
  if (field.mode === "none") return "";
  return field.value;
}

export function buildCronExpression(state: CronBuilderState) {
  return cronFieldDefinitions
    .map(({ key }) => renderCronField(state[key]))
    .filter((value, index) => index < 6 || value)
    .join(" ")
    .trim();
}

export function parseCronExpression(expression: string): CronBuilderState {
  const fields = expression.trim().split(/\s+/).filter(Boolean);
  if (![5, 6, 7].includes(fields.length)) throw new Error("Cron 表达式需要 5、6 或 7 个字段。");

  const values = fields.length === 5 ? ["0", ...fields] : fields;
  const year = fields.length === 7 ? values[6] : "";
  const state = createDefaultCronState();
  const keys: CronFieldKey[] = ["second", "minute", "hour", "day", "month", "weekday"];
  keys.forEach((key, index) => {
    const value = values[index] ?? "*";
    state[key] = { mode: inferFieldMode(key, value), value };
  });
  state.year = year ? { mode: inferFieldMode("year", year), value: year } : { mode: "none", value: "" };
  return state;
}

function inferFieldMode(key: CronFieldKey, value: string): CronFieldMode {
  if (!value) return key === "year" ? "none" : "custom";
  if (value === "*") return "every";
  if (value === "?") return "noSpecific";
  if (value.toUpperCase() === "L") return "last";
  if (key === "weekday" && /^\d+L$/i.test(value)) return "lastWeekday";
  if (key === "weekday" && /^\d+#\d+$/.test(value)) return "nthWeekday";
  if (value.includes("/")) return "interval";
  if (value.includes("-")) return "range";
  if (value.includes(",")) return "list";
  return "specific";
}

function yearInTimezone(date: Date, timezone: string) {
  const yearPart = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric" })
    .formatToParts(date)
    .find((part) => part.type === "year");
  return Number(yearPart?.value ?? date.getUTCFullYear());
}

function firstYearForRule(rule: string, currentYear: number) {
  if (!rule || rule === "*") return null;
  if (rule.includes(",")) {
    const years = rule.split(",").map(Number).filter(Number.isFinite);
    return years.find((year) => year >= currentYear) ?? Math.min(...years);
  }
  if (rule.includes("/")) return Number(rule.split("/")[0]);
  if (rule.includes("-")) return Number(rule.split("-")[0]);
  return Number(rule);
}

function yearMatches(rule: string, year: number): boolean {
  if (!rule || rule === "*") return true;
  if (rule.includes(",")) return rule.split(",").some((part) => yearMatches(part, year));
  if (rule.includes("/")) {
    const [start, stepText] = rule.split("/");
    const step = Number(stepText);
    return Number.isFinite(step) && step > 0 && (year - Number(start)) % step === 0;
  }
  if (rule.includes("-")) {
    const [start, end] = rule.split("-").map(Number);
    return year >= start && year <= end;
  }
  return Number(rule) === year;
}

export function getNextCronRuns(expression: string, timezone: string, count = 5, currentDate = new Date()) {
  const sourceFields = expression.trim().split(/\s+/).filter(Boolean);
  const yearRule = sourceFields.length === 7 ? sourceFields[6] : "";
  const fields = sourceFields.length === 5
    ? ["0", ...sourceFields]
    : sourceFields.length === 7
      ? sourceFields.slice(0, 6)
      : sourceFields;
  const parserExpression = fields.map((field) => (field === "?" ? "*" : field)).join(" ");
  const currentYear = yearInTimezone(currentDate, timezone);
  const firstYear = firstYearForRule(yearRule, currentYear);
  const parserCurrentDate = firstYear && firstYear > currentYear
    ? new Date(Date.UTC(firstYear, 0, 1) - 1000)
    : currentDate;
  const interval = CronExpressionParser.parse(parserExpression, {
    currentDate: parserCurrentDate,
    tz: timezone,
  });
  const runs: Date[] = [];
  let attempts = 0;

  const maxAttempts = yearRule ? Math.max(count * 48, 20000) : count * 48;
  while (runs.length < count && attempts < maxAttempts) {
    attempts += 1;
    const next = interval.next().toDate();
    if (!yearRule || yearMatches(yearRule, yearInTimezone(next, timezone))) runs.push(next);
  }
  return runs;
}

export function formatCronDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export const cronTimezones = [
  "Asia/Shanghai",
  "UTC",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

export const cronExamples = [
  { label: "每天 09:00", value: "0 0 9 * * ?" },
  { label: "每 5 分钟", value: "0 */5 * * * ?" },
  { label: "工作日 09:00", value: "0 0 9 ? * 1-5" },
  { label: "每月最后一天", value: "0 0 23 L * ?" },
];
