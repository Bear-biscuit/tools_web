export type DateDifference = {
  days: number;
  weeks: number;
  businessDays: number;
  months: number;
  years: number;
};

function parseDateInput(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error("请选择有效日期。");
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) {
    throw new Error("日期不存在。");
  }
  return date;
}

export function toDateInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(value: string, days: number) {
  const date = parseDateInput(value);
  date.setDate(date.getDate() + Math.round(days));
  return toDateInputValue(date);
}

export function countBusinessDays(startValue: string, endValue: string) {
  const start = parseDateInput(startValue);
  const end = parseDateInput(endValue);
  const direction = start <= end ? 1 : -1;
  const cursor = new Date(Math.min(start.getTime(), end.getTime()));
  const finish = new Date(Math.max(start.getTime(), end.getTime()));
  let count = 0;
  while (cursor < finish) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count * direction;
}

export function getDateDifference(startValue: string, endValue: string): DateDifference {
  const start = parseDateInput(startValue);
  const end = parseDateInput(endValue);
  const milliseconds = end.getTime() - start.getTime();
  const days = Math.round(milliseconds / 86_400_000);
  const earlier = start <= end ? start : end;
  const later = start <= end ? end : start;
  let months = (later.getFullYear() - earlier.getFullYear()) * 12 + later.getMonth() - earlier.getMonth();
  if (later.getDate() < earlier.getDate()) months -= 1;

  return {
    days,
    weeks: Number((days / 7).toFixed(2)),
    businessDays: countBusinessDays(startValue, endValue),
    months: start <= end ? months : -months,
    years: Math.trunc(days / 365),
  };
}