import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider, createTheme, PaletteMode, CssBaseline } from "@mui/material";

type Mode = "light" | "dark" | "system";
type Ctx = { mode: Mode; setMode: (m: Mode) => void };
const ThemeModeContext = createContext<Ctx>({ mode: "system", setMode: () => {} });

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem("themeMode") as Mode) || "system");
  const prefersDark = typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      // trigger rerender when system theme flips
      setMode((m) => (m === "system" ? "system" : m));
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const actual: PaletteMode = mode === "system" ? (prefersDark ? "dark" : "light") : (mode as PaletteMode);
  const theme = useMemo(() => createTheme({ palette: { mode: actual } }), [actual]);

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}