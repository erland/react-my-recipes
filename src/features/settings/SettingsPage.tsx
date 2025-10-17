// src/features/settings/SettingsPage.tsx
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
} from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  exportRecipesToJsonBlob,
  downloadBlob,
  importRecipesFromJsonFile,
} from "@/utils/backup";

export default function SettingsPage() {
  const { t } = useTranslation();

  const [snack, setSnack] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    try {
      const blob = await exportRecipesToJsonBlob();
      const ts = new Date().toISOString().replace(/[:]/g, "-");
      downloadBlob(blob, `recipes-export-${ts}.json`);
      setSnack({
        open: true,
        message: t("settings.export.success"),
        severity: "success",
      });
    } catch (e) {
      setSnack({
        open: true,
        message: t("settings.export.error"),
        severity: "error",
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    // allow selecting the same file again later
    e.target.value = "";
    if (!file) return;

    try {
      const result = await importRecipesFromJsonFile(file);
      setSnack({
        open: true,
        message: t("settings.import.success", {
          total: result.total,
          added: result.added,
          updated: result.updated,
        }),
        severity: "success",
      });
    } catch {
      setSnack({
        open: true,
        message: t("settings.import.error"),
        severity: "error",
      });
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        {t("settings.title")}
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">
            {t("settings.exportImport.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("settings.exportImport.desc")}
          </Typography>

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