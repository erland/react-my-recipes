import React, { useState } from "react";
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
import { useRecipeDetail } from "@/features/recipes/hooks/useRecipeDetail";
import * as recipesService from "@/services/recipesService";
import type { Recipe } from "@/types/recipe";
import RecipeDialog from "./RecipeDialog";
import { useImageUrl } from "@/hooks/useImageUrl"; // keep this
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/schema";

export default function RecipeDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recipe = useRecipeDetail(id);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  // ✅ Call hooks before any early return
  // Pick the first non-deleted image that actually has a blob
  const heroId = useLiveQuery(async () => {
    const ids = recipe?.imageIds ?? [];
    for (const imgId of ids) {
      const img = await db.images.get(imgId);
      if (img && !img.deletedAt && img.blob) return imgId;
    }
    return null;
  }, [JSON.stringify(recipe?.imageIds ?? [])]) ?? null;
  const heroUrl = useImageUrl(heroId || undefined);

  const handleDelete = async () => {
    if (!id) return;
    if (confirm(t("recipeDetail.confirmDelete"))) {
      await recipesService.deleteRecipe(id);
      navigate("/recipes");
    }
  };

  const handleEdit = () => setDialogOpen(true);
  const handleDialogClose = () => setDialogOpen(false);
  const handleDialogSave = async (data: Partial<Recipe>, existingId?: string) => {
    if (!existingId) return; // detail page only edits existing
    await recipesService.updateRecipe(existingId, data);
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
    <>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">{recipe.title}</Typography>
          <Box>
            <Tooltip title={t("recipeDetail.edit")}>
              <IconButton color="primary" onClick={handleEdit}>
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

        {/* Hero image */}
        {heroUrl && (
          <Box
            sx={{
              width: "100%",
              height: { xs: 240, sm: 300, md: 360 }, // responsive hero height
              borderRadius: 1,
              mt: 2,
              overflow: "hidden",
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              component="img"
              src={heroUrl}
              alt={recipe.title}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "contain",     // 👈 show whole image
                display: "block",
              }}
              loading="lazy"
            />
          </Box>
        )}

        <Typography variant="body1" sx={{ mt: 2 }}>
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
                    primary={`${(ing.name ?? "").trim()}${
                      ing.quantity ? ` – ${ing.quantity}` : ""
                    }`}
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
                        s.durationMin
                          ? `${s.durationMin} ${t("recipeDetail.minutes")}`
                          : undefined
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

      <RecipeDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        recipe={recipe}
        onSave={handleDialogSave}
      />
    </>
  );
}