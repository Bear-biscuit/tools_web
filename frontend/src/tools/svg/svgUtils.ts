export function sanitizeSvg(source: string) {
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/javascript:/gi, "");
}

export function optimizeSvg(source: string) {
  const sanitized = sanitizeSvg(source);
  return sanitized
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
    .replace(/\s(?:inkscape|sodipodi|xmlns:inkscape|xmlns:sodipodi):[\w.-]+="[^"]*"/gi, "")
    .replace(/\s(?:data-name|data-testid)="[^"]*"/gi, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .replace(/(\d+\.\d{3,})/g, (_match, number: string) => String(Number(number)))
    .trim();
}

function countMatches(source: string, pattern: RegExp) {
  return (source.match(pattern) ?? []).length;
}

export function analyzeSvg(source: string) {
  return {
    bytes: new TextEncoder().encode(source).length,
    elements: countMatches(source, /<[a-z][\w:-]*\b/gi),
    paths: countMatches(source, /<path\b/gi),
    viewBox: /viewBox=["']([^"']+)["']/i.exec(source)?.[1] ?? "未检测到",
  };
}