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
    driveId: undefined, // ensure new images don't accidentally reuse old mapping
    deletedAt: undefined, // clear any old tombstone in rare cases
  };
  await db.images.put(asset);
  console.debug("[imagesService] saved new image", asset.id, asset.fileName, asset.mime);
  return asset;
}


/**
 * Soft-delete an image by id: sets a tombstone (deletedAt) and removes the blob to free space.
 * Sync will propagate this deletion to Drive (trash) on next run.
 */
export async function deleteImage(id: string): Promise<void> {
  const img = await db.images.get(id);
  if (!img) return;
  await db.images.put({
    ...img,
    deletedAt: Date.now(),
    // Clear heavy fields; keep driveId mapping for propagation
    blob: undefined,
    blobUrl: undefined,
  });
}