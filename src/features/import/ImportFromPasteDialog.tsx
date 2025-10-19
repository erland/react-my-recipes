import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress
} from "@mui/material";
import { useTranslation } from "react-i18next";

export type ImportFromPasteDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void> | void;
  defaultText?: string;
};

export default function ImportFromPasteDialog({
  open, onClose, onSubmit, defaultText,
}: ImportFromPasteDialogProps) {
  const { t } = useTranslation();
  const [text, setText] = React.useState(defaultText || "");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setText(defaultText || "");
  }, [open, defaultText]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    try {
      setBusy(true);
      await onSubmit(text.trim());
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth>
      <DialogTitle>{t("recipes.importFromPaste")}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus fullWidth multiline minRows={6}
          label={t("recipes.pasteLabel")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`${t("recipes.pasteExampleTitle")}\n${t("recipes.pasteExampleIng")}\n- Mjölk – 6 dl\n- Ägg – 3 st\n${t("recipes.pasteExampleSteps")}\n1. Vispa ihop …`}
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