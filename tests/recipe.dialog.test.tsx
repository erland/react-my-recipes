import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipesPage from "@/features/recipes/RecipesPage";
import { renderWithRouter } from "./utils/renderWithRouter";

describe("RecipeDialog interactions", () => {
  it("can add a new recipe manually", async () => {
    renderWithRouter(<RecipesPage />);
    const user = userEvent.setup();

    // Open Add menu → Create manually
    await user.click(await screen.findByRole("button", { name: "recipes.addNew" }));
    await user.click(await screen.findByText("recipes.createManual"));

    // Wait for dialog heading to appear
    await screen.findByRole("heading", { name: "recipeDialog.addTitle" });

    // Match the label (with or without the * suffix)
    const titleInput = await screen.findByLabelText(/recipeDialog\.title/i);
    expect(titleInput).toBeInTheDocument();

    await user.type(titleInput, "Testrecept");
    await user.click(screen.getByRole("button", { name: "common.save" }));

    await waitFor(() => expect(screen.getByText("Testrecept")).toBeInTheDocument());
  });

  it("can add ingredient and step fields", async () => {
    renderWithRouter(<RecipesPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "recipes.addNew" }));
    await user.click(await screen.findByText("recipes.createManual"));
    await screen.findByRole("heading", { name: "recipeDialog.addTitle" });

    await user.click(screen.getByRole("button", { name: "recipeDialog.addIngredient" }));
    await user.click(screen.getByRole("button", { name: "recipeDialog.addStep" }));

    const ingredientInputs = screen.getAllByRole("textbox", { name: /recipeDialog\.ingredientName/i });
    const stepInputs = screen.getAllByRole("textbox", { name: /recipeDialog\.stepText/i });

    expect(ingredientInputs.length).toBeGreaterThan(0);
    expect(stepInputs.length).toBeGreaterThan(0);
  });
});