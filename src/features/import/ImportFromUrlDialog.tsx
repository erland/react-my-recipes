import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress
} from "@mui/material";
import { useTranslation } from "react-i18next";

export type ImportFromUrlDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void> | void;
  defaultUrl?: string;
};

export default function ImportFromUrlDialog({
  open, onClose, onSubmit, defaultUrl,
}: ImportFromUrlDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = React.useState(defaultUrl || "");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setUrl(defaultUrl || "");
  }, [open, defaultUrl]);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    try {
      setBusy(true);
      await onSubmit(url.trim());
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth>
      <DialogTitle>{t("recipes.importFromUrl")}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus fullWidth
          label={t("recipes.importUrlLabel")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
        <Button onClick={handleSubmit} disabled={busy} variant="contained">
          {busy ? <CircularProgress size={20} /> : t("recipes.import")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}