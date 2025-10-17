import { render, screen, waitFor } from "@testing-library/react";
import RecipesPage from "../src/features/recipes/RecipesPage";
import "../src/i18n";
import { db } from "../src/db/schema";

beforeAll(async () => {
  await db.clearAll();
  await db.seedDemoData();
});

test("shows seeded recipes", async () => {
  render(<RecipesPage />);
  await waitFor(() => screen.getByText("Pannkakor"));
  expect(screen.getByText("Pannkakor")).toBeInTheDocument();
});