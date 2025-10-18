import type { Recipe, IngredientRef, RecipeStep } from "@/types/recipe";
import { v4 as uuidv4 } from "uuid";

/**
 * Minimal paste-in parser (SV/EN heuristics).
 * Expected shapes (flexible):
 *
 * Title
 * Ingredienser / Ingredients:
 * - Mjölk – 6 dl
 * - Ägg – 3 st
 * Gör så här / Steps:
 * 1. Vispa ihop ...
 * 2. Stek ...
 */
export function importRecipeFromPaste(text: string): Recipe {
  const now = Date.now();
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim());

  // Title
  let title = "(Namnlöst recept)";
  for (const line of lines) {
    if (!line) continue;
    if (/^(ingredienser|ingredients)\b/i.test(line)) break;
    if (line.startsWith("-") || /^\d+[\.)]/.test(line)) break;
    title = line;
    break;
  }

  const ingHeaderIdx = lines.findIndex((l) =>
    /^(ingredienser|ingredients)\b/i.test(l)
  );
  const stepsHeaderIdx = lines.findIndex((l) =>
    /^(gör så här|steps?)\b/i.test(l)
  );

  const ingStart =
    ingHeaderIdx >= 0 ? ingHeaderIdx + 1 : // after header
    lines.findIndex((l) => /^[-*•]/.test(l)); // or first bullet line
  const ingEnd =
    stepsHeaderIdx > 0
      ? stepsHeaderIdx
      : lines.findIndex((l, i) => i > (ingStart ?? 0) && /^\d+[\.)]/.test(l));

  const stepStart =
    stepsHeaderIdx >= 0
      ? stepsHeaderIdx + 1
      : lines.findIndex((l) => /^\d+[\.)]/.test(l));

  // Ingredients
  let ingredients: IngredientRef[] | undefined;
  if (ingStart >= 0) {
    const raw = lines
      .slice(ingStart, ingEnd > 0 ? ingEnd : lines.length)
      .filter((l) => l && /^[-*•]/.test(l));
    if (raw.length) {
      ingredients = raw.map(stripListPrefix).map(toIngredient);
    }
  }

  // Steps
  let steps: RecipeStep[] | undefined;
  if (stepStart >= 0) {
    const raw = lines.slice(stepStart).filter((l) => l);
    if (raw.length) {
      steps = raw.map(stripListPrefix).map((text, i) => ({
        id: uuidv4(),
        order: i + 1,
        text,
      }));
    }
  }

  return {
    id: uuidv4(),
    title,
    ingredients,
    steps,
    createdAt: now,
    updatedAt: now,
  };
}

function stripListPrefix(s: string): string {
  // Remove "- ", "* ", "• ", "1. ", "1) " etc.
  return s.replace(/^([-*•]\s+|\d+[\.)]\s+)/, "").trim();
}

function toIngredient(line: string): IngredientRef {
  // Split "Name – qty" or "Name - qty" if present
  const m = line.split(/\s+[–-]\s+/, 2);
  const name = (m[0] || line).trim();
  const quantity = m[1]?.trim();
  return { id: uuidv4(), name, quantity };
}