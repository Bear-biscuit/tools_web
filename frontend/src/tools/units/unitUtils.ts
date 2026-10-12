export type UnitCategory = "length" | "mass" | "area" | "volume" | "speed" | "data" | "temperature";

type UnitDefinition = { label: string; toBase: (value: number) => number; fromBase: (value: number) => number };

const linear = (factor: number): UnitDefinition => ({ label: "", toBase: (value) => value * factor, fromBase: (value) => value / factor });

export const unitCategories: Record<UnitCategory, { label: string; units: Record<string, UnitDefinition> }> = {
  length: { label: "长度", units: { mm: linear(0.001), cm: linear(0.01), m: linear(1), km: linear(1000), in: linear(0.0254), ft: linear(0.3048), yd: linear(0.9144), mi: linear(1609.344) } },
  mass: { label: "重量", units: { mg: linear(0.000001), g: linear(0.001), kg: linear(1), t: linear(1000), oz: linear(0.028349523125), lb: linear(0.45359237) } },
  area: { label: "面积", units: { cm2: linear(0.0001), m2: linear(1), km2: linear(1_000_000), ha: linear(10_000), ft2: linear(0.09290304), acre: linear(4046.8564224) } },
  volume: { label: "体积", units: { ml: linear(0.001), l: linear(1), m3: linear(1000), cup: linear(0.2365882365), gal: linear(3.785411784) } },
  speed: { label: "速度", units: { mps: linear(1), kph: linear(0.2777777778), mph: linear(0.44704), knot: linear(0.5144444444) } },
  data: { label: "数据", units: { B: linear(1), KB: linear(1024), MB: linear(1024 ** 2), GB: linear(1024 ** 3), TB: linear(1024 ** 4), bit: linear(0.125) } },
  temperature: {
    label: "温度",
    units: {
      C: { label: "", toBase: (value) => value, fromBase: (value) => value },
      F: { label: "", toBase: (value) => (value - 32) * 5 / 9, fromBase: (value) => value * 9 / 5 + 32 },
      K: { label: "", toBase: (value) => value - 273.15, fromBase: (value) => value + 273.15 },
    },
  },
};

Object.values(unitCategories).forEach((category) => {
  Object.entries(category.units).forEach(([key, unit]) => { unit.label = key; });
});

export function convertUnit(category: UnitCategory, value: number, from: string, to: string) {
  const units = unitCategories[category].units;
  const fromUnit = units[from];
  const toUnit = units[to];
  if (!fromUnit || !toUnit) throw new Error("单位不存在。");
  return toUnit.fromBase(fromUnit.toBase(value));
}