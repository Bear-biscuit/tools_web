export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export function calculateWatermarkPosition(
  container: { width: number; height: number },
  item: { width: number; height: number },
  position: WatermarkPosition,
  padding = 24,
) {
  const left = position.includes("left") ? padding : position.includes("right") ? container.width - item.width - padding : (container.width - item.width) / 2;
  const top = position.includes("top") ? padding : position.includes("bottom") ? container.height - item.height - padding : (container.height - item.height) / 2;
  return { x: Math.max(0, left), y: Math.max(0, top) };
}

export function fitWithin(sourceWidth: number, sourceHeight: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  return { width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)) };
}