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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { exportRecipesToJsonBlob, downloadBlob, importRecipesFromJsonFile } from "@/services/backup/jsonBackup";
import { syncNow } from "@/services/sync/syncEngine";
import { ensureDriveLayout, signOutDrive } from "@/services/sync/googleDriveClient";
import { db } from "@/db/schema";

// ⬇️ NEW: ZIP backup + storage stats
import { exportZip, importZip } from "@/services/backup/zipBackup";
import { useStorageStats, fmtBytes } from "@/hooks/useStorageStats";
import { useThemeMode } from "@/providers/AppThemeProvider";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [snack, setSnack] = React.useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });

  const [autoSync, setAutoSync] = React.useState<boolean>(false);
  const [status, setStatus] = React.useState<string>("");

  // Language & Theme state
  const savedLang = ((localStorage.getItem("lang") || i18n.language || "sv") as string).startsWith("sv") ? "sv" : "en";
  const [lang, setLang] = React.useState<"sv" | "en">(savedLang);
  const { mode, setMode } = useThemeMode();

  const handleLangChange = (e: SelectChangeEvent) => {
    const next = e.target.value as "sv" | "en";
    setLang(next);
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  const handleThemeChange = (e: SelectChangeEvent) => {
    const next = e.target.value as "light" | "dark" | "system";
    setMode(next);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const zipFileInputRef = React.useRef<HTMLInputElement>(null); // ⬅️ NEW

  // ⬇️ NEW: live storage stats (recipes/images + approximate quota usage)
  const stats = useStorageStats();

  React.useEffect(() => {
    (async () => {
      const st = await db.syncState.get("google-drive");
      setAutoSync(!!st?.autoSync);
      const connected = !!(st?.recipesFileId && st?.driveFolderId);
      setStatus(connected ? String(t("settings.sync.connected")) : String(t("settings.sync.disconnected")));
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

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importRecipesFromJsonFile(file);
      setSnack({
        open: true,
        severity: "success",
        message: String(
          t("settings.import.success", {
            total: res.total,
            added: res.added,
            updated: res.updated,
          })
        ),
      });
    } catch {
      setSnack({ open: true, severity: "error", message: String(t("settings.import.error")) });
    } finally {
      e.target.value = "";
    }
  }

  // ⬇️ NEW: ZIP export/import handlers
  const [busyZipExport, setBusyZipExport] = React.useState(false);
  const [busyZipImport, setBusyZipImport] = React.useState(false);

  async function handleExportZip() {
    try {
      setBusyZipExport(true);
      await exportZip();
      setSnack({ open: true, severity: "success", message: "ZIP export done." });
    } catch (e: any) {
      setSnack({ open: true, severity: "error", message: e?.message || "ZIP export failed." });
    } finally {
      setBusyZipExport(false);
    }
  }

  function handleImportZipClick() {
    zipFileInputRef.current?.click();
  }

  async function handleImportZipSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusyZipImport(true);
      await importZip(file);
      setSnack({ open: true, severity: "success", message: "ZIP import done." });
    } catch (e: any) {
      setSnack({ open: true, severity: "error", message: e?.message || "ZIP import failed." });
    } finally {
      setBusyZipImport(false);
      e.target.value = "";
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
          <Typography variant="h6">{t("settings.backup.title")}</Typography>
          <Typography color="text.secondary">{t("settings.backup.desc")}</Typography>

          {/* ⬇️ NEW: storage usage line */}
          <Typography variant="body2" color="text.secondary">
            {/* Prefer i18n key if you add it; otherwise this neutral text is fine */}
            {`${fmtBytes(stats.usedBytes)} of ${fmtBytes(stats.quotaBytes)} used • ${stats.recipeCount} recipes • ${stats.imageCount} images (≈ ${fmtBytes(stats.imageBytes)})`}
          </Typography>

          <Divider />

          {/* Existing JSON export/import */}
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
              accept="application/json,json"
              onChange={handleImportSelected}
              style={{ display: "none" }}
            />
          </Stack>

          {/* ⬇️ NEW: ZIP export/import for recipes + images */}
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={handleExportZip} disabled={busyZipExport}>
              {busyZipExport ? "Exporting ZIP…" : "Export (ZIP)"}
            </Button>
            <Button variant="contained" onClick={handleImportZipClick} disabled={busyZipImport}>
              {busyZipImport ? "Importing ZIP…" : "Import (ZIP)"}
            </Button>
            <input
              ref={zipFileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={handleImportZipSelected}
              style={{ display: "none" }}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* LANGUAGE & THEME SECTION */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">{t("settings.language")} / {t("settings.theme.label")}</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="lang-select-label">{t("settings.language")}</InputLabel>
              <Select
                labelId="lang-select-label"
                label={t("settings.language")}
                value={lang}
                onChange={handleLangChange}
              >
                <MenuItem value="sv">Svenska</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="theme-select-label">{t("settings.theme")}</InputLabel>
              <Select
                labelId="theme-select-label"
                label={t("settings.theme")}
                value={mode}
                onChange={handleThemeChange}
              >
                <MenuItem value="light">{t("settings.theme.light")}</MenuItem>
                <MenuItem value="dark">{t("settings.theme.dark")}</MenuItem>
                <MenuItem value="system">{t("settings.theme.system")}</MenuItem>
              </Select>
            </FormControl>
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