import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithRouter } from "./utils/renderWithRouter";
import RecipesPage from "../src/features/recipes/RecipesPage";
import "../src/i18n";
import { db } from "../src/db/schema";

beforeAll(async () => {
  await db.clearAll();
  await db.seedDemoData();
});

test("can add a recipe", async () => {
  renderWithRouter(<RecipesPage />);
  const addBtn = await screen.findByRole("button", { name: /lägg till nytt recept/i });
  fireEvent.click(addBtn);
  fireEvent.change(screen.getByLabelText(/titel/i), { target: { value: "Testrecept" } });
  fireEvent.click(screen.getByText(/spara/i));
  await waitFor(() => screen.getByText("Testrecept"));
});