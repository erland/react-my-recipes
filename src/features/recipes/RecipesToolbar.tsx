import React from "react";
import { Stack, TextField, Slider, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

export type RecipesToolbarProps = {
  query: string;
  onQueryChange: (q: string) => void;
  maxTimeMin: number | null;                 // null = no limit
  onMaxTimeMinChange: (v: number | null) => void;
  onAdd?: () => void;                         // optional “New recipe” handler
};

export default function RecipesToolbar({
  query,
  onQueryChange,
  maxTimeMin,
  onMaxTimeMinChange,
  onAdd,
}: RecipesToolbarProps) {
  const { t } = useTranslation();
  const sliderVal = maxTimeMin ?? 0; // 0 means “no limit” in UI

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
      <TextField
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        label={t("recipes.search") || "Search"}
        fullWidth
        inputProps={{ "data-testid": "recipes-search" }}
      />

      <Stack sx={{ minWidth: 220 }}>
        <Typography variant="caption">
          {t("recipes.maxTime") || "Max time (min)"}
        </Typography>
        <Slider
          value={sliderVal}
          min={0}
          max={240}
          step={5}
          valueLabelDisplay="auto"
          valueLabelFormat={(v: number) => (v === 0 ? (t("recipes.noLimit") || "No limit") : `${v} min`)}
          onChange={(_, v) => {
            const n = Array.isArray(v) ? (v[0] ?? 0) : Number(v);
            onMaxTimeMinChange(n);
          }}
          onChangeCommitted={(_, v) => {
            const n = Array.isArray(v) ? (v[0] ?? 0) : Number(v);
            onMaxTimeMinChange(n === 0 ? null : n);
          }}
        />
      </Stack>

      {!!onAdd && (
        <Button variant="contained" onClick={onAdd}>
          {t("recipes.add") || "Add recipe"}
        </Button>
      )}
    </Stack>
  );
}