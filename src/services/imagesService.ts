// src/services/imagesService.ts
import { db } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import type { ImageAsset } from "@/types/image";
import { compressImage } from "@/utils/imageUtils";

/**
 * Save an image file: compress (WebP/JPEG), persist in IndexedDB, return ImageAsset.
 * Centralizes writes outside UI/components.
 */
export async function saveImageFile(file: File): Promise<ImageAsset> {
  const { blob, width, height, mime } = await compressImage(file);
  const asset: ImageAsset = {
    id: uuidv4(),
    fileName: file.name,
    width,
    height,
    mime,
    updatedAt: Date.now(),
    blob,
  };
  await db.images.put(asset);
  return asset;
}