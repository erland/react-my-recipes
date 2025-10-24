import { useMemo } from "react";
import { useRecipesQuery } from "./useRecipesQuery";

export function useAllTags(): string[] {
  const recipes = useRecipesQuery() || [];
  return useMemo(() => {
    const s = new Set<string>();
    for (const r of recipes) {
      for (const t of r.tags ?? []) s.add(t);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [recipes]);
}