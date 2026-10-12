export type CleanerOptions = {
  trimLines: boolean;
  removeEmptyLines: boolean;
  removeDuplicateLines: boolean;
  collapseSpaces: boolean;
  removeLineBreaks: boolean;
  stripHtml: boolean;
  lowercase: boolean;
  removePunctuation: boolean;
};

export const defaultCleanerOptions: CleanerOptions = {
  trimLines: true,
  removeEmptyLines: false,
  removeDuplicateLines: false,
  collapseSpaces: true,
  removeLineBreaks: false,
  stripHtml: false,
  lowercase: false,
  removePunctuation: false,
};

export function cleanText(input: string, options: CleanerOptions) {
  let text = input;
  if (options.stripHtml) text = text.replace(/<[^>]*>/g, "");
  if (options.collapseSpaces) text = text.replace(/[ \t]+/g, " ");
  if (options.removeLineBreaks) text = text.replace(/\r?\n+/g, " ");
  let lines = text.split(/\r?\n/);
  if (options.trimLines) lines = lines.map((line) => line.trim());
  if (options.removeEmptyLines) lines = lines.filter((line) => line !== "");
  if (options.removeDuplicateLines) {
    const seen = new Set<string>();
    lines = lines.filter((line) => { if (seen.has(line)) return false; seen.add(line); return true; });
  }
  text = lines.join("\n");
  if (options.lowercase) text = text.toLowerCase();
  if (options.removePunctuation) text = text.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/g, "");
  return text.trim();
}