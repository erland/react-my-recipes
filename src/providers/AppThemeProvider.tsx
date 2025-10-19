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
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemDark("matches" in e ? e.matches : mq.matches);
    };
    // initialize in case it flipped before effect ran
    onChange(mq);
    if (mq.addEventListener) {
      mq.addEventListener("change", onChange as (ev: MediaQueryListEvent) => void);
    } else {
      // Safari < 14.1
      // @ts-ignore
      mq.addListener(onChange);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", onChange as (ev: MediaQueryListEvent) => void);
      } else {
        // @ts-ignore
        mq.removeListener(onChange);
      }
    };
  }, []);

  const actual: PaletteMode = mode === "system" ? (systemDark ? "dark" : "light") : (mode as PaletteMode);
  const theme = useMemo(() => createTheme({ palette: { mode: actual } }), [actual]);

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "themeMode" && e.newValue) {
        setMode(e.newValue as Mode);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}