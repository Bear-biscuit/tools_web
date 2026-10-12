import charMapsData from "./charMaps.json";

type TextStyleDefinition = {
  name: string;
  cname: string;
  ename: string;
  map: Record<string, string>;
};

type RawTextStyleDefinition = Omit<TextStyleDefinition, "ename"> & {
  ename?: string;
  enaem?: string;
};

const rawCharMaps = charMapsData as unknown as Record<string, RawTextStyleDefinition>;
const charMaps = Object.fromEntries(
  Object.entries(rawCharMaps).map(([key, value]) => [
    key,
    {
      ...value,
      ename: value.ename ?? value.enaem ?? key,
    },
  ]),
) as Record<string, TextStyleDefinition>;

export function getTextStyles() {
  return Object.values(charMaps);
}

export function convertText(text: string, style: string) {
  const definition = charMaps[style] ?? charMaps.normal;
  if (!definition || style === "normal") return text;

  return Array.from(text)
    .map((character) => definition.map[character] ?? character)
    .join("");
}