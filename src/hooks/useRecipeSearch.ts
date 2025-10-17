import { useLiveQuery } from "dexie-react-hooks";
import Fuse from "fuse.js";
import { db } from "@/db/schema";
import type { Recipe } from "@/types/recipe";

interface SearchOptions {
  query: string;
  maxTime: number;
}

export function useRecipeSearch({ query, maxTime }: SearchOptions) {
  return useLiveQuery<Recipe[]>(async () => {
    const all = await db.recipes.orderBy("updatedAt").reverse().toArray();

    // --- Time filter logic (180+ means include all) ---
    const filtered = all.filter((r) => {
      const total =
        r.totalTimeMin ?? (r.prepTimeMin ?? 0) + (r.cookTimeMin ?? 0);
      return maxTime >= 180 || (total && total <= maxTime);
    });

    // --- Fuse.js search ---
    if (!query.trim()) return filtered;

    const fuse = new Fuse(filtered, {
      threshold: 0.4,
      keys: [
        "title",
        "description",
        "ingredients.name",
        "tags",
        "categories",
        "steps.text",
        "sourceName",
        "notes",
      ],
    });

    const results = fuse.search(query);
    return results.map((r) => r.item);
  }, [query, maxTime]);
}