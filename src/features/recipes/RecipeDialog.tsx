import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { db } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import type { Recipe } from "@/types/recipe";

interface RecipeDialogProps {
  open: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
}

export default function RecipeDialog({ open, onClose, recipe }: RecipeDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalTimeMin, setTotalTimeMin] = useState<number | "">("");

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title || "");
      setDescription(recipe.description || "");
      setTotalTimeMin(recipe.totalTimeMin ?? "");
    } else {
      setTitle("");
      setDescription("");
      setTotalTimeMin("");
    }
  }, [recipe]);

  const handleSave = async () => {
    if (!title.trim()) return;

    const baseData: Partial<Recipe> = {
      title: title.trim(),
      description: description.trim(),
      totalTimeMin: totalTimeMin === "" ? undefined : Number(totalTimeMin),
      updatedAt: Date.now(),
    };

    if (recipe?.id) {
      await db.recipes.update(recipe.id, baseData);
    } else {
      const newRecipe: Recipe = {
        id: uuidv4(),
        ...baseData,
        createdAt: Date.now(),
        servings: 1,
        tags: [],
        categories: [],
        ingredients: [],
        steps: [],
        updatedAt: Date.now(),
      } as Recipe;

      await db.recipes.add(newRecipe);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {recipe ? t("recipeDialog.editTitle") : t("recipeDialog.addTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t("recipeDialog.title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label={t("recipeDialog.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
          <TextField
            label={t("recipeDialog.totalTime")}
            type="number"
            value={totalTimeMin}
            onChange={(e) =>
              setTotalTimeMin(e.target.value === "" ? "" : Number(e.target.value))
            }
            InputProps={{ inputProps: { min: 0 } }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button onClick={handleSave} variant="contained">
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}