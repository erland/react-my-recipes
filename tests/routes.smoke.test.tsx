import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import AppLayout from "../src/app/AppLayout";
import RecipesPage from "../src/features/recipes/RecipesPage";
import RecipeDetail from "../src/features/recipes/RecipeDetail";
import SettingsPage from "../src/app/SettingsPage";
import "../src/i18n";

test("renders routes without crashing", () => {
  const router = createMemoryRouter([
    {
      path: "/",
      element: <AppLayout />,
      children: [
        { index: true, element: <RecipesPage /> },
        { path: "recipes", element: <RecipesPage /> },
        { path: "recipes/:id", element: <RecipeDetail /> },
        { path: "settings", element: <SettingsPage /> },
      ],
    },
  ]);
  const { getByText } = render(<RouterProvider router={router} />);
  expect(getByText("Recept")).toBeInTheDocument();
});
