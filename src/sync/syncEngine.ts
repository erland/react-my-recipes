import { db } from "@/db/schema";
import type { Recipe } from "@/types/recipe";
import type { RemotePayloadV1 } from "@/types/sync";
import { ensureDriveLayout, downloadRecipesJson, uploadRecipesJson } from "./googleDriveClient";

export type SyncResult = {
  uploaded: number;
  downloaded: number;
  merged: number;
};

function byId<T extends { id: string }>(arr: T[]): Record<string, T> {
  return Object.fromEntries(arr.map((x) => [x.id, x]));
}

function lwwMerge(local: Recipe[], remote: Recipe[]): Recipe[] {
  // MVP: recipe-level LWW by `updatedAt`. (Upgrade to field-level when timestamps exist per field.)
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

  // Write back to Dexie (replace all for simplicity)
  await db.transaction("rw", db.recipes, async () => {
    await db.recipes.clear();
    await db.recipes.bulkAdd(merged);
  });

  // Upload merged to Drive
  const payload: RemotePayloadV1 = {
    format: "recipebox.sync.v1",
    exportedAt: new Date().toISOString(),
    data: { recipes: merged },
  };
  await uploadRecipesJson(state.recipesFileId, payload);

  // MERGE-SAFE WRITE: keep existing fields in syncState
  const prev = await db.syncState.get("google-drive");
  await db.syncState.put(
    {
      ...(prev ?? { id: "google-drive" }),
      id: "google-drive",
      lastSyncAt: Date.now(),
      lastError: null,
    },
    "google-drive"
  );

  return { uploaded: merged.length, downloaded: remote.length, merged: merged.length };
}