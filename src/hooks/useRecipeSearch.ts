import { useLiveQuery } from "dexie-react-hooks";
import Fuse from "fuse.js";
import { db } from "@/db/schema";
import type { Recipe } from "@/types/recipe";

type SearchOptions = { query: string; maxTime: number };

/**
 * Returns recipes filtered by time and searched with Fuse.
 * - If maxTime < 180: hide recipes without a computable total time.
 * - If maxTime >= 180: show all.
 */
export function useRecipeSearch({ query, maxTime }: SearchOptions) {
  return useLiveQuery<Recipe[]>(async () => {
    const all = await db.recipes.orderBy("updatedAt").reverse().toArray();

    // Time filter
    const filtered = all.filter((r) => {
      const sum = (r.prepTimeMin ?? 0) + (r.cookTimeMin ?? 0);
      const effectiveTotal = r.totalTimeMin ?? (sum > 0 ? sum : undefined);
      if (maxTime < 180) {
        return effectiveTotal !== undefined && effectiveTotal <= maxTime;
      }
      return true;
    });

    // No search term → return time-filtered list
    if (!query.trim()) return filtered;

    // Fuse config with weights
    const fuse = new Fuse(filtered, {
      threshold: 0.35,
      ignoreLocation: true,
      keys: [
        { name: "title", weight: 3 },
        { name: "ingredients.name", weight: 2.5 },
        { name: "tags", weight: 1.5 },
        { name: "categories", weight: 1.5 },
        { name: "description", weight: 1 },
        { name: "steps.text", weight: 1 },
        { name: "sourceName", weight: 1 },
        { name: "notes", weight: 1 },
      ],
    });

    return fuse.search(query).map((r) => r.item);
  }, [query, maxTime]);
}