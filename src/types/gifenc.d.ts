declare module "gifenc" {
  export type GifPalette = Array<[number, number, number] | [number, number, number, number]>;

  export type GifEncoderInstance = {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: GifPalette;
        delay?: number;
        repeat?: number;
        colorDepth?: number;
        transparent?: boolean;
        transparentIndex?: number;
        dispose?: number;
      },
    ): void;
    finish(): void;
    bytesView(): Uint8Array;
  };

  export function GIFEncoder(options?: {
    initialCapacity?: number;
    auto?: boolean;
  }): GifEncoderInstance;
  export function quantize(
    data: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: {
      format?: "rgb565" | "rgb444" | "rgba4444";
      clearAlpha?: boolean;
      clearAlphaColor?: number;
      clearAlphaThreshold?: number;
      oneBitAlpha?: boolean | number | null;
      useSqrt?: boolean;
    },
  ): GifPalette;
  export function applyPalette(
    data: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: "rgb565" | "rgb444" | "rgba4444",
  ): Uint8Array;
}
