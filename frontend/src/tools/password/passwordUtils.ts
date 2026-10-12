export type PasswordOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
};

export type PasswordStrength = {
  score: 1 | 2 | 3 | 4;
  label: string;
  key: "weak" | "fair" | "good" | "strong";
};

const SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
};

const AMBIGUOUS = /[O0oIl1|`'"]/g;

export const defaultPasswordOptions: PasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
};

function getSelectedSets(options: PasswordOptions) {
  const sets = (Object.keys(SETS) as Array<keyof typeof SETS>)
    .filter((key) => options[key])
    .map((key) => SETS[key]);
  if (!sets.length) throw new Error("至少选择一种字符类型。");
  return options.excludeAmbiguous
    ? sets.map((set) => set.replace(AMBIGUOUS, ""))
    : sets;
}

function randomIndex(length: number, random: () => number) {
  const normalized = Math.min(0.999999999, Math.max(0, random()));
  return Math.floor(normalized * length);
}

function shuffle(values: string[], random: () => number) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1, random);
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

export function generatePassword(
  options: PasswordOptions,
  random: () => number = Math.random,
) {
  const sets = getSelectedSets(options);
  const length = Math.max(sets.length, Math.round(options.length));
  const characters = sets.map((set) => set[randomIndex(set.length, random)]);

  const pool = sets.join("");
  while (characters.length < length) {
    characters.push(pool[randomIndex(pool.length, random)]);
  }

  return shuffle(characters, random).join("");
}

export function calculateEntropyBits(length: number, options: PasswordOptions) {
  const poolSize = getSelectedSets(options).reduce((total, set) => total + set.length, 0);
  return Math.round(length * Math.log2(poolSize));
}

export function getPasswordStrength(entropyBits: number): PasswordStrength {
  if (entropyBits < 40) return { score: 1, label: "较弱", key: "weak" };
  if (entropyBits < 60) return { score: 2, label: "一般", key: "fair" };
  if (entropyBits < 80) return { score: 3, label: "良好", key: "good" };
  return { score: 4, label: "很强", key: "strong" };
}