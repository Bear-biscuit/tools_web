export type QueryParameter = {
  id: string;
  key: string;
  value: string;
};

export type ParsedUrl = {
  href: string;
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  hash: string;
  query: QueryParameter[];
};

function queryId(index: number) {
  return `query-${index}`;
}

function normalizeUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("请输入 URL。");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parseUrl(value: string): ParsedUrl {
  const url = new URL(normalizeUrlInput(value));
  return {
    href: url.href,
    protocol: url.protocol.replace(/:$/, ""),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    hash: url.hash.replace(/^#/, ""),
    query: [...url.searchParams.entries()].map(([key, parameterValue], index) => ({
      id: queryId(index),
      key,
      value: parameterValue,
    })),
  };
}

export function buildUrl(input: Omit<ParsedUrl, "href"> | ParsedUrl) {
  const url = new URL(`${input.protocol}://${input.hostname}`);
  if (input.port) url.port = input.port;
  if (input.username) url.username = input.username;
  if (input.password) url.password = input.password;
  url.pathname = input.pathname || "/";
  url.hash = input.hash ? `#${input.hash}` : "";
  url.search = "";
  input.query.forEach((parameter) => {
    if (parameter.key.trim()) url.searchParams.append(parameter.key.trim(), parameter.value);
  });
  return url.href;
}

export function createQueryParameter(index: number): QueryParameter {
  return { id: `query-${Date.now()}-${index}`, key: "", value: "" };
}