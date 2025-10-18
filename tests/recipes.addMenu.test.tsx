import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipesPage from "@/features/recipes/RecipesPage";
import { renderWithRouter } from "./utils/renderWithRouter";

describe("RecipesPage Add menu", () => {
  it("shows all Add options when clicking +", async () => {
    renderWithRouter(<RecipesPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "recipes.addNew" }));

    const items = await screen.findAllByRole("menuitem");
    const labels = items.map((i) => i.textContent?.trim());
    expect(labels).toEqual(
      expect.arrayContaining([
        "recipes.createManual",
        "recipes.importFromUrl",
        "recipes.importFromPaste",
      ])
    );
  });

  it("opens and closes URL import dialog", async () => {
    renderWithRouter(<RecipesPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "recipes.addNew" }));
    await user.click(await screen.findByText("recipes.importFromUrl"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // cancel button uses "common.cancel"
    await user.click(screen.getByRole("button", { name: "common.cancel" }));
    await waitFor(() => expect(dialog).not.toBeVisible());
  });

  it("opens and closes Paste import dialog", async () => {
    renderWithRouter(<RecipesPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "recipes.addNew" }));
    await user.click(await screen.findByText("recipes.importFromPaste"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "common.cancel" }));
    await waitFor(() => expect(dialog).not.toBeVisible());
  });
});