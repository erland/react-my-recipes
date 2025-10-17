import React from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function RecipeDetail() {
  const { id } = useParams();
  const { t } = useTranslation();

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5">{t("recipeDetail.title", { id })}</Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body1" color="text.secondary">
          {t("recipeDetail.placeholder")}
        </Typography>
      </Box>
    </Paper>
  );
}
