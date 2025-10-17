// src/utils/autoSyncToast.tsx
import React from "react";
import { Snackbar, Alert } from "@mui/material";
import { syncNow } from "@/sync/syncEngine";
import { db } from "@/db/schema";

export function useAutoSyncToast() {
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string; severity: "info" | "success" | "error" }>({
    open: false,
    msg: "",
    severity: "info",
  });

  // Triggered externally (e.g., from main.tsx)
  async function triggerAutoSync(reason: string) {
    try {
      const st = await db.syncState.get("google-drive");
      if (!st?.autoSync) return;
      setSnack({ open: true, msg: "Synkar…", severity: "info" });
      await syncNow();
      setSnack({ open: true, msg: "Synk klar ✓", severity: "success" });
    } catch (err) {
      console.error("[AutoSync] Failed:", err);
      setSnack({ open: true, msg: "Synk misslyckades", severity: "error" });
    }
  }

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