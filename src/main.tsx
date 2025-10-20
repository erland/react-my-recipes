import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "./app/AppLayout";
import RecipesPage from "./features/recipes/RecipesPage";
import RecipeDetail from "./features/recipes/RecipeDetail";
import SettingsPage from "./features/settings/SettingsPage";
import "./i18n";
import { ensurePersistentStorage, logStorageEstimate } from "@/utils/persistence";
import { useAutoSyncToast } from "@/components/toasts/autoSyncToast";
import { AppThemeProvider } from "@/providers/AppThemeProvider";

// ✅ import Dexie instance early
import { db } from "@/db/schema";

// ✅ expose globally (use ts-ignore for build)
 // @ts-ignore
if (import.meta.env.DEV) {
  (window as any).db = db;
  console.log("[debug] window.db exposed");
}

// Ask for durable storage as soon as possible (non-blocking)
ensurePersistentStorage().then((ok) => {
  console.log("[storage] persistent granted:", ok);
});
logStorageEstimate();


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
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function Root() {
  const { triggerAutoSync, Toast } = useAutoSyncToast();

  React.useEffect(() => {
    triggerAutoSync("startup");
    const handler = () => triggerAutoSync("online");
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [triggerAutoSync]);

  return (
    <>
      <RouterProvider router={router} />
      {Toast}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <Root />
    </AppThemeProvider>
  </React.StrictMode>
);