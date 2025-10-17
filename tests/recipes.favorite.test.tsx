// tests/recipes.favorite.test.tsx
import React from "react";
import { describe, it, beforeEach, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { db } from "@/db/schema";
import RecipesPage from "@/features/recipes/RecipesPage";

describe("RecipesPage – favorite toggle", () => {
  const id = "fav-1";

  beforeEach(async () => {
    await db.recipes.clear();
    await db.recipes.add({
      id,
      title: "Pannkakor",
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  it("toggles favorite on click and persists to DB", async () => {
    render(
      <MemoryRouter>
        <RecipesPage />
      </MemoryRouter>
    );

    // First favorite button (Tooltip/aria-label is localized).
    // Match either Swedish or English just in case.
    const favBtn = await screen.findByRole("button", {
      name: /favoritmarkera|favorite/i,
    });

    await userEvent.click(favBtn);

    // After toggle, label becomes Unfavorite ("Ta bort favorit" in sv)
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /ta bort favorit|unfavorite/i,
        })
      ).toBeInTheDocument();
    });

    const updated = await db.recipes.get(id);
    expect(updated?.favorite).toBe(true);
  });
});