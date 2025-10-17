import { db } from "@/db/schema";
import type { Recipe } from "@/types/recipe";

export type ExportFileV1 = {
  format: "recipebox.export.v1";
  exportedAt: string; // ISO string
  data: { recipes: Recipe[] };
};

export async function exportRecipesToJsonBlob(): Promise<Blob> {
  const recipes = await db.recipes.toArray();
  const payload: ExportFileV1 = {
    format: "recipebox.export.v1",
    exportedAt: new Date().toISOString(),
    data: { recipes },
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importRecipesFromJsonFile(file: File) {
  const text = await file.text();
  return importRecipesFromJsonText(text);
}

export async function importRecipesFromJsonText(text: string) {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }

  let recipes: any[] = [];
  if (Array.isArray(parsed)) {
    recipes = parsed;
  } else if (parsed?.data?.recipes) {
    recipes = parsed.data.recipes;
  } else if (parsed?.recipes) {
    recipes = parsed.recipes;
  } else {
    throw new Error("Unsupported export format");
  }

  let added = 0;
  let updated = 0;

  await db.transaction("rw", db.recipes, async () => {
    for (const raw of recipes) {
      const r = { ...raw } as Partial<Recipe>;
      const now = Date.now();

      // Ensure timestamps (Dexie hook will set if missing, but we normalize here too)
      if (r.createdAt == null) r.createdAt = now as any;
      if (r.updatedAt == null) r.updatedAt = now as any;

      if (r.id) {
        const exists = await db.recipes.get(r.id);
        if (exists) {
          // Merge to avoid losing fields if import is partial
          const merged: Recipe = {
            ...exists,
            ...r,
            id: exists.id, // keep canonical id
            // preserve createdAt if missing in import
            createdAt: (r.createdAt ?? exists.createdAt)!,
            // make sure updatedAt moves forward
            updatedAt: (r.updatedAt ?? now) as number,
          } as Recipe;

          await db.recipes.put(merged);
          updated++;
        } else {
          await db.recipes.add(r as Recipe);
          added++;
        }
      } else {
        await db.recipes.add(r as Recipe);
        added++;
      }
    }
  });

  return {
    total: recipes.length,
    added,
    updated,
  };
}