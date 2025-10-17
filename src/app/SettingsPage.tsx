import React from "react";
import { Box, Typography, Stack, Switch, FormControlLabel, Divider, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { db } from "@/db/schema";

export default function SettingsPage() {
  const { t } = useTranslation();

  const handleSeed = async () => {
    await db.clearAll();
    await db.seedDemoData();
    alert("Demo data seeded!");
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>{t("settings.title")}</Typography>
      <Divider sx={{ mb: 2 }} />
      <Stack spacing={2}>
        <Button variant="outlined" onClick={handleSeed}>
          Seed demo data
        </Button>
        <FormControlLabel control={<Switch disabled />} label={t("settings.autoSync")} />
        <FormControlLabel control={<Switch disabled />} label={t("settings.installPwa")} />
        <Typography variant="body2" color="text.secondary">
          {t("settings.note")}
        </Typography>
      </Stack>
    </Box>
  );
}
