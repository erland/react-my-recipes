import React from "react";
import { Snackbar, Alert } from "@mui/material";
import { syncNow } from "@/sync/syncEngine";
import { db } from "@/db/schema";

type Sev = "info" | "success" | "error";

export function useAutoSyncToast() {
  const [snack, setSnack] = React.useState<{
    open: boolean;
    msg: string;
    severity: Sev;
  }>({
    open: false,
    msg: "",
    severity: "info",
  });

  // Prevent double-runs / loops
  const inFlightRef = React.useRef(false);
  const lastAtRef = React.useRef(0);
  const THROTTLE_MS = 5000;

  const triggerAutoSync = React.useCallback(async (_reason: string) => {
    try {
      const st = await db.syncState.get("google-drive");
      const connected = !!(st?.recipesFileId || st?.driveFolderId);

      // Only run if auto-sync is enabled AND user has connected before
      if (!st?.autoSync || !connected) return;

      const now = Date.now();
      if (inFlightRef.current || now - lastAtRef.current < THROTTLE_MS) return;

      inFlightRef.current = true;
      setSnack({ open: true, msg: "Synkar…", severity: "info" });

      await syncNow();

      // ✅ MERGE-SAFE WRITE (preserves token + settings)
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