import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import { ArrowBack, Delete, Edit } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useRecipeDetail } from "@/hooks/useRecipeDetail";
import { db } from "@/db/schema";

export default function RecipeDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recipe = useRecipeDetail(id);

  const handleDelete = async () => {
    if (!id) return;
    if (confirm(t("recipeDetail.confirmDelete"))) {
      await db.recipes.delete(id);
      navigate("/recipes");
    }
  };

  if (!recipe)
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          {t("recipeDetail.notFound")}
        </Typography>
      </Paper>
    );

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">{recipe.title}</Typography>
        <Box>
          <Tooltip title={t("recipeDetail.edit")}>
            <IconButton color="primary">
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("recipeDetail.delete")}>
            <IconButton color="error" onClick={handleDelete}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      </Stack>

      <Typography variant="body1" sx={{ mt: 1 }}>
        {recipe.description || t("recipeDetail.noDescription")}
      </Typography>

      <Divider sx={{ my: 2 }} />

      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <>
          <Typography variant="h6">{t("recipeDetail.ingredients")}</Typography>
          <List dense>
            {recipe.ingredients.map((ing) => (
              <ListItem key={ing.id}>
                <ListItemText
                  primary={`${ing.name}${ing.quantity ? ` – ${ing.quantity}` : ""}`}
                  secondary={ing.note}
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
        </>
      )}

      {recipe.steps && recipe.steps.length > 0 && (
        <>
          <Typography variant="h6">{t("recipeDetail.steps")}</Typography>
          <List dense>
            {recipe.steps
              .sort((a, b) => a.order - b.order)
              .map((s) => (
                <ListItem key={s.id}>
                  <ListItemText
                    primary={`${s.order}. ${s.text}`}
                    secondary={
                      s.durationMin ? `${s.durationMin} ${t("recipeDetail.minutes")}` : undefined
                    }
                  />
                </ListItem>
              ))}
          </List>
        </>
      )}

      {recipe.totalTimeMin && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {t("recipeDetail.totalTime", { minutes: recipe.totalTimeMin })}
          </Typography>
        </>
      )}

      <Divider sx={{ my: 3 }} />

      <Button startIcon={<ArrowBack />} onClick={() => navigate("/recipes")}>
        {t("recipeDetail.back")}
      </Button>
    </Paper>
  );
}