import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/schema";
import type { Recipe } from "@/types/recipe";

export function useRecipesQuery() {
  return useLiveQuery<Recipe[]>(() => db.recipes.orderBy("updatedAt").reverse().toArray(), []);
}