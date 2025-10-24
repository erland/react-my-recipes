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
  trashDriveImage,
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
          format: "myrecipes.sync.v1",
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
  if (state.imagesFolderId) {
    const remoteImages = await listDriveImages(state.imagesFolderId);
    const remoteByUuid: Record<string, DriveImageMeta> = {};
    const remoteById: Record<string, DriveImageMeta> = {};
    for (const f of remoteImages) {
      remoteById[f.id] = f;
      const base = (f.name || "").split("/").pop() || "";
      const uuid = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
      if (uuid) remoteByUuid[uuid] = f;
    }

    // 1) Pull newer/missing images from Drive (respect local tombstones)
    for (const [uuid, meta] of Object.entries(remoteByUuid)) {
      const localImg = await db.images.get(uuid);
      const remoteMs = meta.modifiedTime ? Date.parse(meta.modifiedTime) : 0;
      const localMs = localImg?.updatedAt ?? 0;
      const localDeletedAt = localImg?.deletedAt ?? 0;
      const tombstoneBlocks = localDeletedAt && localDeletedAt >= remoteMs;
      const needsDownload =
        (!localImg || !localImg.blob || remoteMs > localMs) && !tombstoneBlocks;
      if (!needsDownload) continue;
      try {
        const blob = await downloadDriveImage(meta.id);
        let width: number | undefined, height: number | undefined;
        try {
          const bmp = await createImageBitmap(blob);
          width = bmp.width;
          height = bmp.height;
          // @ts-ignore
          bmp.close?.();
        } catch {}
        const asset: ImageAsset = {
          id: uuid,
          fileName: meta.name,
          updatedAt: Math.max(remoteMs, Date.now()),
          deletedAt: undefined,
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

    // 2) Apply remote deletions → tombstone locally if remote is missing
    const locals = await db.images.toArray();
    const remoteUuidSet = new Set(Object.keys(remoteByUuid));
    const remoteIdSet = new Set(Object.keys(remoteById));
    for (const img of locals) {
      if (img.deletedAt) continue;
      const missingByUuid = !remoteUuidSet.has(img.id);
      const missingByDriveId = !!img.driveId && !remoteIdSet.has(img.driveId);
      if (img.driveId && missingByUuid && missingByDriveId) {
        console.debug("[sync][images] remote missing → tombstoning locally", img.id, img.fileName);
        await db.images.put({
          ...img,
          deletedAt: Date.now(),
          blob: undefined,
          blobUrl: undefined,
        });
      }
    }

    // 3) Push local images (trash → upload/update)
    const localsAfterDeletes = await db.images.toArray();
    for (const img of localsAfterDeletes) {
      const remote = img.driveId ? remoteById[img.driveId] : remoteByUuid[img.id];
      const remoteMs = remote?.modifiedTime ? Date.parse(remote.modifiedTime) : 0;
      const localMs = img.updatedAt ?? 0;
      const extFromMime = (m?: string) =>
        m?.includes("webp")
          ? "webp"
          : m?.includes("jpeg") || m?.includes("jpg")
          ? "jpg"
          : m?.includes("png")
          ? "png"
          : "bin";
      const fileName = `${img.id}.${extFromMime(img.mime)}`;
      try {
        if (img.deletedAt) {
          if (remote) await trashDriveImage(remote.id);
          continue;
        }
        if (!img.blob) continue;
        if (!remote) {
          const newId = await createDriveImage(state.imagesFolderId, fileName, img.blob as Blob);
          await db.images.update(img.id, { driveId: newId });
        } else if (localMs > remoteMs) {
          await updateDriveImage(remote.id, img.blob as Blob);
          if (!img.driveId) await db.images.update(img.id, { driveId: remote.id });
        } else if (!img.driveId) {
          await db.images.update(img.id, { driveId: remote.id });
        }
      } catch (e) {
        console.warn("[sync][images] upload failed", img.id, e);
      }
    }

    // 4) Mark local orphans (images no longer referenced by any recipe)
    const allRecipes = await db.recipes.toArray();
    const referencedIds = new Set(allRecipes.flatMap((r) => r.imageIds ?? []).filter(Boolean));
    const allImages = await db.images.toArray();
    for (const img of allImages) {
      const isReferenced = referencedIds.has(img.id);
      if (!isReferenced && !img.deletedAt) {
        console.debug("[sync][images] orphaned locally → tombstoning", img.id, img.fileName);
        await db.images.put({
          ...img,
          deletedAt: Date.now(),
          blob: undefined,
          blobUrl: undefined,
        });
      }
    }

    // 5) Clean up old tombstoned images (local-only deletion)
    const tombstoned = await db.images.where("deletedAt").above(0).toArray();
    const retainMs = 7 * 24 * 60 * 60 * 1000; // keep for 7 days
    for (const img of tombstoned) {
      const ageMs = Date.now() - (img.deletedAt ?? 0);
      if (ageMs > retainMs) {
        console.debug("[sync][images] purging tombstoned image", img.id, img.fileName);
        await db.images.delete(img.id);
      }
    }
  }

  // Upload merged dataset back to Drive
  const payload: RemotePayloadV1 = {
    format: "myrecipes.sync.v1",
    exportedAt: new Date().toISOString(),
    data: { recipes: merged },
  };
  await uploadRecipesJson(state.recipesFileId, payload);

  // ✅ MERGE-SAFE WRITE
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