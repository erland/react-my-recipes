import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithRouter } from "./utils/renderWithRouter";
import RecipesPage from "../src/features/recipes/RecipesPage";
import RecipeDialog from "../src/features/recipes/RecipeDialog";
import userEvent from "@testing-library/user-event";
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
test("can add ingredient and step", async () => {
  const user = userEvent.setup();

  renderWithRouter(<RecipeDialog open onClose={() => {}} />);

  await waitFor(() =>
    expect(screen.getByRole("button", { name: /lägg till ingrediens/i })).toBeInTheDocument()
  );

  await user.click(screen.getByRole("button", { name: /lägg till ingrediens/i }));
  await user.click(screen.getByRole("button", { name: /lägg till steg/i }));

  expect(screen.getAllByLabelText(/Ingrediensnamn|Ingrediens/i)).toHaveLength(1);
  expect(screen.getAllByLabelText(/Stegtext|Steg/i)).toHaveLength(1);
});