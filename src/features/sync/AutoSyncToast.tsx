import React from "react";
import { Snackbar, Alert } from "@mui/material";
import { syncNow } from "@/services/sync/syncEngine";
import { db } from "@/db/schema";

/** Toast + trigger for settings “Auto-sync” */
export function useAutoSyncToast() {
  const inFlightRef = React.useRef(false);
  const lastAtRef = React.useRef<number | null>(null);
  const [snack, setSnack] = React.useState<{
    open: boolean;
    msg: string;
    severity: "success" | "error";
  }>({ open: false, msg: "", severity: "success" });

  const triggerAutoSync = React.useCallback(async () => {
    if (inFlightRef.current) return;
    // Throttle: at most once every 30s
    if (lastAtRef.current && Date.now() - lastAtRef.current < 30_000) return;
    inFlightRef.current = true;

    try {
      await syncNow();
      // ✅ MERGE-SAFE WRITE (preserves token)
      const prev = await db.syncState.get("google-drive");
      await db.syncState.put(
        {
          ...(prev ?? { id: "google-drive" as const }),
          id: "google-drive" as const,
          lastSyncAt: Date.now(),
          lastError: null,
        },
        "google-drive"
      );
      setSnack({ open: true, msg: "Synk klar ✓", severity: "success" });
    } catch (err: any) {
      // ✅ MERGE-SAFE WRITE (preserves token)
      const prev = await db.syncState.get("google-drive");
      await db.syncState.put(
        {
          ...(prev ?? { id: "google-drive" as const }),
          id: "google-drive" as const,
          lastError: String(err?.message || err),
        },
        "google-drive"
      );

      setSnack({ open: true, msg: "Synk misslyckades", severity: "error" });
    } finally {
      lastAtRef.current = Date.now();
      inFlightRef.current = false;
    }
  }, []);

  const Toast = (
    <Snackbar
      open={snack.open}
      autoHideDuration={3000}
      onClose={() => setSnack((s) => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={snack.severity}
        variant="filled"
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        {snack.msg}
      </Alert>
    </Snackbar>
  );

  return { triggerAutoSync, Toast };
}
