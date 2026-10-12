export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') { quoted = false; }
      else { field += character; }
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (character !== "\r") field += character;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((current, index) => index < rows.length - 1 || current.some((value) => value !== ""));
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvToJson(text: string) {
  const rows = parseCsv(text.trim());
  if (rows.length < 2) throw new Error("CSV 至少需要表头和一行数据。");
  const headers = rows[0].map((header, index) => header.trim() || `column_${index + 1}`);
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

export function jsonToCsv(value: unknown) {
  const rows = Array.isArray(value) ? value : [value];
  if (!rows.length) return "";
  if (rows.some((row) => typeof row !== "object" || row === null || Array.isArray(row))) throw new Error("JSON 必须是对象或对象数组。");
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>)))];
  return [headers.map(escapeCsv).join(","), ...rows.map((row) => headers.map((header) => escapeCsv((row as Record<string, unknown>)[header])).join(","))].join("\n");
}