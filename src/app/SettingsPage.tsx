import React from "react";
import { Box, Typography, Stack, Switch, FormControlLabel, Divider } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>{t("settings.title")}</Typography>
      <Divider sx={{ mb: 2 }} />
      <Stack spacing={2}>
        <FormControlLabel control={<Switch disabled />} label={t("settings.autoSync")} />
        <FormControlLabel control={<Switch disabled />} label={t("settings.installPwa")} />
        <Typography variant="body2" color="text.secondary">
          {t("settings.note")}
        </Typography>
      </Stack>
    </Box>
  );
}
