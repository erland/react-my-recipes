import { db } from "@/db/schema";
import type { Recipe } from "@/types/recipe";
import type { RemotePayloadV1 } from "@/types/sync";
import {
  ensureDriveLayout,
  downloadRecipesJson,
  uploadRecipesJson,
  listDriveImages,
  downloadDriveImage,
  createDriveImage,
  updateDriveImage,
  type DriveImageMeta,
} from "./googleDriveClient";
import type { ImageAsset } from "@/types/image";
  
export type SyncResult = {
  uploaded: number;
  downloaded: number;
  merged: number;
};

function byId<T extends { id: string }>(arr: T[]): Record<string, T> {
  return Object.fromEntries(arr.map((x) => [x.id, x]));
}

function lwwMerge(local: Recipe[], remote: Recipe[]): Recipe[] {
  // MVP: recipe-level LWW by `updatedAt`.
  const L = byId(local);
  const R = byId(remote);
  const ids = new Set([...Object.keys(L), ...Object.keys(R)]);
  const merged: Recipe[] = [];
  for (const id of ids) {
    const a = L[id];
    const b = R[id];
    if (a && b) {
      merged.push(a.updatedAt >= b.updatedAt ? a : b);
    } else {
      merged.push((a ?? b)!);
    }
  }
  return merged.sort((x, y) => y.updatedAt - x.updatedAt);
}

export async function syncNow(): Promise<SyncResult> {
  const state = await ensureDriveLayout();
  if (!state.recipesFileId) throw new Error("Missing recipes file");

  const [local, remotePayload] = await Promise.all([
    db.recipes.toArray(),
    downloadRecipesJson(state.recipesFileId).catch(
      () =>
        ({
          format: "recipebox.sync.v1",
          exportedAt: new Date().toISOString(),
          data: { recipes: [] },
        } as RemotePayloadV1)
    ),
  ]);

  const remote = (remotePayload?.data?.recipes ?? []) as Recipe[];
  const merged = lwwMerge(local, remote);

  // Replace all recipes with merged set
  await db.transaction("rw", db.recipes, async () => {
    await db.recipes.clear();
    await db.recipes.bulkAdd(merged);
  });

  // ── Per-image incremental sync (LWW by updatedAt vs Drive modifiedTime) ─────────
  // Skips safely if imagesFolderId is not available (older client).
  if (state.imagesFolderId) {
    // List all remote images under /RecipeBox/images
    const remoteImages = await listDriveImages(state.imagesFolderId);
    const remoteByUuid: Record<string, DriveImageMeta> = {};
    for (const f of remoteImages) {
      const base = (f.name || "").split("/").pop() || "";
      const uuid = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
      if (uuid) remoteByUuid[uuid] = f;
    }

    // 1) Pull newer/missing images from Drive
    for (const [uuid, meta] of Object.entries(remoteByUuid)) {
      const localImg = await db.images.get(uuid);
      const remoteMs = meta.modifiedTime ? Date.parse(meta.modifiedTime) : 0;
      const localMs = localImg?.updatedAt ?? 0;
      const needsDownload = !localImg || !localImg.blob || remoteMs > localMs;
      if (!needsDownload) continue;
      try {
        const blob = await downloadDriveImage(meta.id);
        // Best-effort dimensions
        let width: number | undefined, height: number | undefined;
        try {
          const bmp = await createImageBitmap(blob);
          width = bmp.width; height = bmp.height;
          // @ts-ignore (close may not exist across browsers)
          bmp.close?.();
        } catch {}
        const asset: ImageAsset = {
          id: uuid,
          fileName: meta.name,
          updatedAt: Math.max(remoteMs, Date.now()),
          blob,
          mime: blob.type || meta.mimeType,
          width,
          height,
          driveId: meta.id,
        };
        await db.images.put(asset);
      } catch (e) {
        console.warn("[sync][images] download failed", uuid, e);
      }
    }

    // 2) Push local images that are new or newer than Drive
    const locals = await db.images.toArray();
    for (const img of locals) {
      if (!img.blob) continue; // nothing to upload
      const remote = img.driveId
        ? remoteImages.find(r => r.id === img.driveId)
        : remoteByUuid[img.id];
      const remoteMs = remote?.modifiedTime ? Date.parse(remote.modifiedTime) : 0;
      const localMs = img.updatedAt ?? 0;
      const extFromMime = (m?: string) =>
        m?.includes("webp") ? "webp" :
        (m?.includes("jpeg") || m?.includes("jpg")) ? "jpg" :
        m?.includes("png") ? "png" : "bin";
      const fileName = `${img.id}.${extFromMime(img.mime)}`;
      try {
        if (!remote) {
          // Create on Drive and remember driveId
          const newId = await createDriveImage(state.imagesFolderId, fileName, img.blob as Blob);
          await db.images.update(img.id, { driveId: newId });
        } else if (localMs > remoteMs) {
          // Update the existing Drive file
          await updateDriveImage(remote.id, img.blob as Blob);
          if (!img.driveId) await db.images.update(img.id, { driveId: remote.id });
        } else {
          // Remote is newer or equal — just ensure mapping exists
          if (!img.driveId) await db.images.update(img.id, { driveId: remote.id });
        }
      } catch (e) {
        console.warn("[sync][images] upload failed", img.id, e);
      }
    }
  }

  // Upload merged dataset back to Drive
  const payload: RemotePayloadV1 = {
    format: "recipebox.sync.v1",
    exportedAt: new Date().toISOString(),
    data: { recipes: merged },
  };
  await uploadRecipesJson(state.recipesFileId, payload);

  // ✅ MERGE-SAFE WRITE: keep accessToken and other fields intact
  const prev = await db.syncState.get("google-drive");
  await db.syncState.put(
    {
      ...(prev ?? { id: "google-drive" as const }),
      id: "google-drive" as const,
      lastSyncAt: Date.now(),
      lastError: null,
    },
    "google-drive"
  );

  return { uploaded: merged.length, downloaded: remote.length, merged: merged.length };
}