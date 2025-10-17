// tests/hooks/useRecipeSearch.timefilter.test.ts
import { describe, it, beforeEach, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "@/db/schema";
import { useRecipeSearch } from "@/hooks/useRecipeSearch";

describe("useRecipeSearch – time filter edge case", () => {
  beforeEach(async () => {
    await db.recipes.clear();

    // r1: unknown total (no totalTimeMin, no prep/cook)
    await db.recipes.add({
      id: "r1",
      title: "Unknown Time",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // r2: computable total (10 + 20 = 30)
    await db.recipes.add({
      id: "r2",
      title: "Quick Soup",
      prepTimeMin: 10,
      cookTimeMin: 20,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  it("hides unknown totals when maxTime < 180 and shows them at ≥ 180", async () => {
    const { result, rerender } = renderHook(
      (props: { query: string; maxTime: number }) =>
        useRecipeSearch({ query: props.query, maxTime: props.maxTime }),
      { initialProps: { query: "", maxTime: 60 } }
    );

    // With maxTime 60 (< 180): only the computable one should appear.
    await waitFor(() => {
      const titles = (result.current ?? []).map((r) => r.title);
      expect(titles).toContain("Quick Soup");
      expect(titles).not.toContain("Unknown Time");
    });

    // Raise to 180 (≥ 180): include all (unknown totals too).
    rerender({ query: "", maxTime: 180 });

    await waitFor(() => {
      const titles = (result.current ?? []).map((r) => r.title);
      expect(titles).toContain("Quick Soup");
      expect(titles).toContain("Unknown Time");
    });
  });
});