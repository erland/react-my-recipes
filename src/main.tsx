import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import AppLayout from "./app/AppLayout";
import RecipesPage from "./features/recipes/RecipesPage";
import RecipeDetail from "./features/recipes/RecipeDetail";
import SettingsPage from "./app/SettingsPage";
import "./i18n";

const theme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    background: { default: "#f7f7f7" },
  },
});

// ✅ Updated router with v7-compatible "future" options
const router = createBrowserRouter(
  [
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
  ],
  {
    // 👇 This block silences warnings on v6.22+
    // and has no effect once you upgrade to v7.
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);