// src/services/recipesService.ts
import { db } from "@/db/schema";
import type { Recipe } from "@/types/recipe";

/** Create a new recipe from form data (dialog). Returns the new id. */
export async function createRecipe(partial: Partial<Recipe>): Promise<string> {
  // Defaults that the previous dialog added explicitly
  const id = await db.recipes.add({
    ...partial,
    servings: partial.servings ?? 1,
    tags: partial.tags ?? [],
    categories: partial.categories ?? [],
  } as Recipe);
  return id as string;
}

/** Update an existing recipe from form data (dialog). */
export async function updateRecipe(id: string, partial: Partial<Recipe>): Promise<void> {
  await db.recipes.update(id, partial);
}

/** Toggle “favorite” flag from list item. */
export async function setFavorite(id: string, next: boolean): Promise<void> {
  await db.recipes.update(id, { favorite: next });
}

/** Insert a fully-formed recipe (used by importers). */
export async function insertImportedRecipe(recipe: Recipe): Promise<string> {
  const id = await db.recipes.add(recipe);
  return id as string;
}

/** Delete a recipe (detail page). */
export async function deleteRecipe(id: string): Promise<void> {
  await db.recipes.delete(id);
}