import React from "react";
import { Box, Stack, TextField, Typography, Slider, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function RecipesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [maxTime, setMaxTime] = React.useState(180);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t("recipes.title")}</Typography>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label={t("recipes.searchEverything")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Box>
            <Typography variant="body2" gutterBottom>{t("recipes.maxTotalTime", { minutes: maxTime === 180 ? "180+" : maxTime })}</Typography>
            <Slider
              value={maxTime}
              onChange={(_, v) => setMaxTime(v as number)}
              valueLabelDisplay="auto"
              step={5}
              min={0}
              max={180}
            />
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          {t("recipes.placeholderList")}
        </Typography>
      </Paper>
    </Stack>
  );
}
