import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import AppLayout from "./app/AppLayout";
import RecipesPage from "./features/recipes/RecipesPage";
import RecipeDetail from "./features/recipes/RecipeDetail";
import SettingsPage from "./features/settings/SettingsPage";
import "./i18n";
import { ensurePersistentStorage, logStorageEstimate } from "@/utils/persistence";
import { useAutoSyncToast } from "@/utils/autoSyncToast";

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

function ThemeContainer() {
  // Persisted theme mode: "light" | "dark" | "system"
  const [mode, setMode] = React.useState<"light" | "dark" | "system">(
    (localStorage.getItem("themeMode") as any) || "system"
  );

  // Track system preference for when mode === "system"
  const [prefersDark, setPrefersDark] = React.useState(
    () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setPrefersDark(mq.matches);
    // Safari fallback
    // @ts-ignore
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => {
      // @ts-ignore
      mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange);
    };
  }, []);

  // React to SettingsPage writing the attribute: document.documentElement.setAttribute("data-theme-mode", ...)
  React.useEffect(() => {
    const attr = "data-theme-mode";
    const node = document.documentElement;
    const obs = new MutationObserver(() => {
      const next = (node.getAttribute(attr) as any) || null;
      if (next && next !== mode) setMode(next);
    });
    obs.observe(node, { attributes: true, attributeFilter: [attr] });
    // initialize from current attribute if present
    const initial = (node.getAttribute(attr) as any) || null;
    if (initial && initial !== mode) setMode(initial);
    return () => obs.disconnect();
  }, [mode]);

  // Also respond to localStorage updates (e.g., other tabs)
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "themeMode") {
        setMode((e.newValue as any) || "system");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const actualMode: "light" | "dark" = mode === "system" ? (prefersDark ? "dark" : "light") : (mode as "light" | "dark");
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: actualMode,
          primary: { main: "#1976d2" },
        },
      }),
    [actualMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Root />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeContainer />
  </React.StrictMode>
);