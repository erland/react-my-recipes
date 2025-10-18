import React from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Divider,
  Button,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { exportRecipesToJsonBlob, downloadBlob, importRecipesFromJsonFile } from "@/utils/backup";
import { syncNow } from "@/sync/syncEngine";
import { ensureDriveLayout, signOutDrive } from "@/sync/googleDriveClient";
import { db } from "@/db/schema";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [snack, setSnack] = React.useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });
  const [autoSync, setAutoSync] = React.useState<boolean>(false);
  const [status, setStatus] = React.useState<string>("");

  React.useEffect(() => {
    (async () => {
      const st = await db.syncState.get("google-drive");
      setAutoSync(!!st?.autoSync);
      const connected = !!(st?.recipesFileId && st?.driveFolderId);
      setStatus(connected ? t("settings.sync.connected") : t("settings.sync.disconnected"));
    })();
  }, [t]);

  async function handleExport() {
    try {
      const blob = await exportRecipesToJsonBlob();
      downloadBlob(blob, `recipes-${new Date().toISOString().slice(0, 10)}.json`);
      setSnack({ open: true, severity: "success", message: String(t("settings.export.success")) });
    } catch {
      setSnack({ open: true, severity: "error", message: String(t("settings.export.error")) });
    }
  }

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  function handleImportClick() {
    fileInputRef.current?.click();
  }
  async function handleImportSelected(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const res = await importRecipesFromJsonFile(file);
      setSnack({
        open: true,
        severity: "success",
        message: String(t("settings.import.success", res as any)),
      });
    } catch {
      setSnack({ open: true, severity: "error", message: String(t("settings.import.error")) });
    } finally {
      ev.target.value = "";
    }
  }

  async function connectDrive() {
    try {
      await ensureDriveLayout();
      setStatus(String(t("settings.sync.connected")));
      setSnack({
        open: true,
        severity: "success",
        message: String(t("settings.sync.connectedSnack")),
      });
    } catch (e: any) {
      setStatus(String(t("settings.sync.disconnected")));
      setSnack({
        open: true,
        severity: "error",
        message: e?.message || String(t("settings.sync.error")),
      });
    }
  }

  async function doSyncNow() {
    try {
      const res = await syncNow();
      setSnack({
        open: true,
        severity: "success",
        message: String(t("settings.sync.syncedSnack", res as any)),
      });
    } catch (e: any) {
      setSnack({
        open: true,
        severity: "error",
        message: e?.message || String(t("settings.sync.error")),
      });
    }
  }

  async function toggleAutoSync(_: any, checked: boolean) {
    setAutoSync(checked);
    const prev = await db.syncState.get("google-drive");
    await db.syncState.put(
      {
        ...(prev ?? { id: "google-drive" as const }),
        id: "google-drive" as const,
        autoSync: checked,
      },
      "google-drive"
    );
  }
  
  async function disconnectDrive() {
    await signOutDrive();
  
    const prev = await db.syncState.get("google-drive");
    // ✅ Only clear Drive linkage — keep access token & expiry intact
    await db.syncState.put(
      {
        ...(prev ?? { id: "google-drive" as const }),
        id: "google-drive" as const,
        recipesFileId: undefined,
        driveFolderId: undefined,
      },
      "google-drive"
    );
  
    setStatus(String(t("settings.sync.disconnected")));
  }
  
  return (
    <Box>
      <Typography variant="h5">{t("settings.title")}</Typography>

      {/* SYNC SECTION */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h6">{t("settings.sync.title")}</Typography>
          <Typography color="text.secondary">{t("settings.sync.desc")}</Typography>
          <Typography variant="body2">
            <strong>{t("settings.sync.status")}:</strong> {status}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={connectDrive}>
              {t("settings.sync.connect")}
            </Button>
            <Button variant="outlined" onClick={doSyncNow}>
              {t("settings.sync.syncNow")}
            </Button>
            <Button variant="text" color="error" onClick={disconnectDrive}>
              {t("settings.sync.disconnect")}
            </Button>
          </Stack>
          <FormControlLabel
            control={<Switch checked={autoSync} onChange={toggleAutoSync} />}
            label={t("settings.sync.auto")}
          />
        </Stack>
      </Paper>

      {/* EXPORT/IMPORT SECTION */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">{t("settings.exportImport.title")}</Typography>
          <Typography color="text.secondary">{t("settings.exportImport.desc")}</Typography>
          <Divider />
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={handleExport}>
              {t("settings.export.json")}
            </Button>
            <Button variant="outlined" onClick={handleImportClick}>
              {t("settings.import.json")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportSelected}
              style={{ display: "none" }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}