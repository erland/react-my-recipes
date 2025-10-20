import React from "react";
import { Stack, TextField, Slider, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

export type RecipesToolbarProps = {
  query: string;
  onQueryChange: (q: string) => void;
  maxTimeMin: number | null;                 // null = 180+ (no limit)
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
  const sliderVal = maxTimeMin ?? 180; // 180+ means “no limit” in UI

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
          {sliderVal === 180
            ? (t("recipes.maxTime", { minutes: "180+" }) || "Max time: 180+")
            : (t("recipes.maxTime", { minutes: sliderVal }) || `Max time: ${sliderVal}`)}
        </Typography>
        <Slider
          value={sliderVal}
          min={0}
          max={180}
          step={5}
          valueLabelDisplay="auto"
          valueLabelFormat={(v: number) => `${v === 180 ? "180+" : v} min`}
          onChange={(_, v) => {
            const n = Array.isArray(v) ? (v[0] ?? 180) : Number(v);
            onMaxTimeMinChange(n);
          }}
          onChangeCommitted={(_, v) => {
            const n = Array.isArray(v) ? (v[0] ?? 180) : Number(v);
            // 180 means unlimited in our logic
            onMaxTimeMinChange(n === 180 ? null : n);
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