export type JsonFormatMode = "pretty" | "minify";

type JsonFormatSuccess = {
  ok: true;
  output: string;
};

type JsonFormatFailure = {
  ok: false;
  message: string;
  line?: number;
  column?: number;
};

export type JsonFormatResult = JsonFormatSuccess | JsonFormatFailure;

const MAX_INPUT_LENGTH = 1_000_000;

function parseLocation(message: string) {
  const match = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);

  if (!match) return {};

  return {
    line: Number(match[1]),
    column: Number(match[2]),
  };
}

export function transformJson(
  input: string,
  mode: JsonFormatMode = "pretty",
): JsonFormatResult {
  const source = input.trim();

  if (!source) {
    return {
      ok: false,
      message: "请输入或粘贴 JSON 内容。",
    };
  }

  if (source.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      message: "内容超过 1 MB，请拆分后再处理。",
    };
  }

  try {
    const parsed: unknown = JSON.parse(source);

    return {
      ok: true,
      output:
        mode === "pretty"
          ? JSON.stringify(parsed, null, 2)
          : JSON.stringify(parsed),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON 格式不正确。";
    const location = parseLocation(message);

    return {
      ok: false,
      message: message.replace(/^JSON\.parse:\s*/i, ""),
      ...location,
    };
  }
}

export function formatJson(input: string) {
  return transformJson(input, "pretty");
}

export function minifyJson(input: string) {
  return transformJson(input, "minify");
}

export function getJsonStats(input: string) {
  return {
    characters: input.length,
    lines: input ? input.split(/\r?\n/).length : 0,
  };
}