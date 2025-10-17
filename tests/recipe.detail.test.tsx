// tests/recipe.detail.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RecipeDetail from "../src/features/recipes/RecipeDetail";
import "../src/i18n";
import { db } from "../src/db/schema";

beforeAll(async () => {
  await db.clearAll();
  await db.seedDemoData();
});

test("renders a recipe detail", async () => {
  render(
    <MemoryRouter initialEntries={["/recipes/demo-1"]}>
      <Routes>
        <Route path="/recipes/:id" element={<RecipeDetail />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => screen.getByText("Pannkakor"));
  expect(screen.getByText("Ingredienser")).toBeInTheDocument();
});