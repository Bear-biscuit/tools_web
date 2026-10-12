type RegexMatch = {
  value: string;
  index: number;
  groups: string[];
};

export type RegexResult = {
  matches: RegexMatch[];
  flags: string;
  error: string;
};

export function runRegex(pattern: string, flags: string, text: string): RegexResult {
  if (!pattern) return { matches: [], flags, error: "" };
  try {
    const normalizedFlags = [...new Set(flags.split("").filter((flag) => "dgimsuvy".includes(flag)))].join("");
    const searchFlags = normalizedFlags.includes("g") ? normalizedFlags : `${normalizedFlags}g`;
    const regex = new RegExp(pattern, searchFlags);
    const matches: RegexMatch[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      matches.push({ value: match[0], index: match.index, groups: match.slice(1) });
      if (!match[0]) regex.lastIndex += 1;
      if (matches.length >= 5000) break;
    }
    return { matches, flags: normalizedFlags, error: "" };
  } catch (reason) {
    return {
      matches: [],
      flags,
      error: reason instanceof Error ? reason.message : "正则表达式无效。",
    };
  }
}

export function replaceRegex(pattern: string, flags: string, text: string, replacement: string) {
  try {
    const normalizedFlags = [...new Set(flags.split("").filter((flag) => "dgimsuvy".includes(flag)))].join("");
    const regex = new RegExp(pattern, normalizedFlags.includes("g") ? normalizedFlags : `${normalizedFlags}g`);
    return regex[Symbol.replace](text, replacement);
  } catch (reason) {
    throw new Error(reason instanceof Error ? reason.message : "替换表达式无效。");
  }
}