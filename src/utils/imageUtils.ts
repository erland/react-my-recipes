import type { ImageAsset } from "@/types/recipe";
import { v4 as uuidv4 } from "uuid";

/** Load a File into an HTMLImageElement (fallback) */
async function loadHTMLImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = url;
      (window as any).__tmp_img__ = img;
    });
    return (window as any).__tmp_img__;
  } finally {
    URL.revokeObjectURL(url);
    delete (window as any).__tmp_img__;
  }
}

type Compressed = { blob: Blob; width: number; height: number; mime: string };

/**
 * Compress to WebP (fallback to JPEG) with longest side capped.
 * @param maxSide Default 1600 per spec
 */
export async function compressImage(
  file: File,
  maxSide = 1600,
  quality = 0.86
): Promise<Compressed> {
  // Try createImageBitmap if present; else <img>
  let bmp: ImageBitmap | null = null;
  try {
    // Some Safari versions require no options for image/* files
    bmp = await createImageBitmap(file);
  } catch {
    bmp = null;
  }

  let iw: number, ih: number, draw: (ctx: CanvasRenderingContext2D) => void;

  if (bmp) {
    iw = bmp.width; ih = bmp.height;
    draw = (ctx) => ctx.drawImage(bmp!, 0, 0, iw, ih);
  } else {
    const img = await loadHTMLImageFromFile(file);
    iw = (img as any).naturalWidth || img.width;
    ih = (img as any).naturalHeight || img.height;
    draw = (ctx) => ctx.drawImage(img, 0, 0, iw, ih);
  }

  const scale = Math.min(1, maxSide / Math.max(iw, ih));
  const ow = Math.max(1, Math.round(iw * scale));
  const oh = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement("canvas");
  canvas.width = ow;
  canvas.height = oh;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  draw(ctx);

  // Prefer WebP; fallback to JPEG if not supported
  const tryMime = "image/webp";
  const fallbackMime = "image/jpeg";
  const mime = canvas.toDataURL(tryMime).startsWith("data:image/webp")
    ? tryMime
    : fallbackMime;

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      mime,
      quality
    )
  );

  return { blob, width: ow, height: oh, mime };
}
