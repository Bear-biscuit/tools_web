type DiffLine = {
  type: "same" | "added" | "removed";
  text: string;
  leftLine?: number;
  rightLine?: number;
};

export type DiffResult = {
  lines: DiffLine[];
  added: number;
  removed: number;
  unchanged: number;
};

function splitLines(value: string) {
  return value.replace(/\r\n/g, "\n").split("\n");
}

export function diffLines(leftText: string, rightText: string): DiffResult {
  const left = splitLines(leftText);
  const right = splitLines(rightText);
  const rows = left.length + 1;
  const columns = right.length + 1;

  if (rows * columns > 1_000_000) {
    throw new Error("文本行数过多，请先拆分后再对比。");
  }

  const table = Array.from({ length: rows }, () => new Uint32Array(columns));
  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] = left[leftIndex] === right[rightIndex]
        ? table[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      lines.push({ type: "same", text: left[leftIndex], leftLine: leftIndex + 1, rightLine: rightIndex + 1 });
      leftIndex += 1;
      rightIndex += 1;
    } else if (table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]) {
      lines.push({ type: "removed", text: left[leftIndex], leftLine: leftIndex + 1 });
      leftIndex += 1;
    } else {
      lines.push({ type: "added", text: right[rightIndex], rightLine: rightIndex + 1 });
      rightIndex += 1;
    }
  }

  while (leftIndex < left.length) {
    lines.push({ type: "removed", text: left[leftIndex], leftLine: leftIndex + 1 });
    leftIndex += 1;
  }
  while (rightIndex < right.length) {
    lines.push({ type: "added", text: right[rightIndex], rightLine: rightIndex + 1 });
    rightIndex += 1;
  }

  return {
    lines,
    added: lines.filter((line) => line.type === "added").length,
    removed: lines.filter((line) => line.type === "removed").length,
    unchanged: lines.filter((line) => line.type === "same").length,
  };
}