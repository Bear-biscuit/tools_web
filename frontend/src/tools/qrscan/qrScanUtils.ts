import jsQR from "jsqr";

export type ScannedQr = {
  data: string;
  location: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  } | null;
};

export function scanQrImageData(data: Uint8ClampedArray, width: number, height: number): ScannedQr | null {
  const result = jsQR(data, width, height, { inversionAttempts: "dontInvert" });
  if (!result) return null;
  return {
    data: result.data,
    location: result.location ?? null,
  };
}