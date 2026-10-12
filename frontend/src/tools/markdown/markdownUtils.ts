import DOMPurify from "dompurify";
import { marked } from "marked";

export type MarkdownStats = {
  characters: number;
  words: number;
  lines: number;
  readingMinutes: number;
};

export function getMarkdownStats(source: string): MarkdownStats {
  const words = source
    .replace(/[#>*_`~[\]()!-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    characters: source.length,
    words,
    lines: source ? source.split(/\r?\n/).length : 0,
    readingMinutes: words ? Math.max(1, Math.ceil(words / 220)) : 0,
  };
}

export function markdownToPlainText(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?|```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[#>*+-]+\s*/gm, "")
    .replace(/[*_~]/g, "")
    .trim();
}

export function renderMarkdown(source: string) {
  const rendered = marked.parse(source, {
    gfm: true,
    breaks: true,
  }) as string;
  return DOMPurify.sanitize(rendered, {
    USE_PROFILES: { html: true },
  });
}