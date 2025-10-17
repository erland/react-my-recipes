import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/schema";
import type { Recipe } from "@/types/recipe";

export function useRecipeDetail(id?: string) {
  return useLiveQuery<Recipe | undefined>(
    () => (id ? db.recipes.get(id) : undefined),
    [id],
  );
}