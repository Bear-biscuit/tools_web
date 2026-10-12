type TimestampUnit = "seconds" | "milliseconds";

export type ParsedTimestamp = {
  milliseconds: number;
  unit: TimestampUnit;
  source: "numeric" | "date";
};

export type TimestampDetails = {
  seconds: string;
  milliseconds: string;
  iso: string;
  local: string;
  utc: string;
  relative: string;
};

const NUMERIC_PATTERN = /^[+-]?\d+(?:\.\d+)?$/;
const SECONDS_UPPER_BOUND = 100_000_000_000;

function assertValidDate(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || Math.abs(milliseconds) > 8.64e15) {
    throw new Error("时间超出可转换范围。");
  }
}

export function parseTimestampInput(value: string): ParsedTimestamp {
  const normalized = value.trim();
  if (!normalized) throw new Error("请输入时间戳或日期。");

  if (NUMERIC_PATTERN.test(normalized)) {
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) throw new Error("时间戳格式不正确。");

    const unit: TimestampUnit = Math.abs(numeric) < SECONDS_UPPER_BOUND ? "seconds" : "milliseconds";
    const milliseconds = unit === "seconds" ? Math.round(numeric * 1000) : Math.round(numeric);
    assertValidDate(milliseconds);
    return { milliseconds, unit, source: "numeric" };
  }

  const milliseconds = Date.parse(normalized);
  if (!Number.isFinite(milliseconds)) {
    throw new Error("无法识别这个时间，请使用时间戳或标准日期文本。");
  }
  return { milliseconds, unit: "milliseconds", source: "date" };
}

export function parseDateTimeLocal(value: string) {
  if (!value) throw new Error("请选择日期和时间。");
  const milliseconds = Date.parse(value);
  assertValidDate(milliseconds);
  return milliseconds;
}

function formatWithTimezone(milliseconds: number, timeZone?: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(milliseconds));
}

export function getRelativeTime(milliseconds: number, now = Date.now()) {
  const difference = milliseconds - now;
  const absolute = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
    ["second", 1000],
  ];

  const [unit, size] = units.find(([, unitSize]) => absolute >= unitSize) ?? units[units.length - 1];
  return formatter.format(Math.round(difference / size), unit);
}

export function getTimestampDetails(milliseconds: number): TimestampDetails {
  assertValidDate(milliseconds);
  return {
    seconds: String(Math.trunc(milliseconds / 1000)),
    milliseconds: String(Math.trunc(milliseconds)),
    iso: new Date(milliseconds).toISOString(),
    local: formatWithTimezone(milliseconds),
    utc: formatWithTimezone(milliseconds, "UTC"),
    relative: getRelativeTime(milliseconds),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateTimeLocalValue(milliseconds: number) {
  assertValidDate(milliseconds);
  const date = new Date(milliseconds);
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join("T");
}