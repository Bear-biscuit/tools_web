export type ZonedTime = {
  timeZone: string;
  formatted: string;
  weekday: string;
  dayOffset: number;
};

function partsFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

export function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = partsFor(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

export function getZonedTime(date: Date, timeZone: string, baseTimeZone = "UTC"): ZonedTime {
  const parts = partsFor(date, timeZone);
  const baseParts = partsFor(date, baseTimeZone);
  const localDay = Date.UTC(parts.year, parts.month - 1, parts.day);
  const baseDay = Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day);
  return {
    timeZone,
    formatted: new Intl.DateTimeFormat("zh-CN", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date),
    weekday: new Intl.DateTimeFormat("zh-CN", { timeZone, weekday: "short" }).format(date),
    dayOffset: Math.round((localDay - baseDay) / 86_400_000),
  };
}

export function buildMeetingTimes(baseDate: Date, timeZones: string[], baseTimeZone = "UTC") {
  return timeZones.map((timeZone) => getZonedTime(baseDate, timeZone, baseTimeZone));
}