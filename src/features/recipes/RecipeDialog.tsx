import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
} from "@mui/material";
import { Add, Delete, ExpandMore } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { db } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import type { Recipe, IngredientRef, RecipeStep } from "@/types/recipe";

interface RecipeDialogProps {
  open: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
}

export default function RecipeDialog({ open, onClose, recipe }: RecipeDialogProps) {
  const { t } = useTranslation();

  // --- Base fields ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalTimeMin, setTotalTimeMin] = useState<number | "">("");

  // --- Nested arrays ---
  const [ingredients, setIngredients] = useState<IngredientRef[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);

  // Load or reset when recipe changes
  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title ?? "");
      setDescription(recipe.description ?? "");
      setTotalTimeMin(recipe.totalTimeMin ?? "");
      setIngredients(recipe.ingredients ?? []);
      setSteps(recipe.steps ?? []);
    } else {
      setTitle("");
      setDescription("");
      setTotalTimeMin("");
      setIngredients([]);
      setSteps([]);
    }
  }, [recipe]);

  // --- Mutators ---
  const addIngredient = () =>
    setIngredients((prev) => [...prev, { id: uuidv4(), name: "", quantity: "" }]);

  const updateIngredient = (id: string, field: "name" | "quantity", value: string) =>
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const deleteIngredient = (id: string) =>
    setIngredients((prev) => prev.filter((i) => i.id !== id));

  const addStep = () =>
    setSteps((prev) => [...prev, { id: uuidv4(), order: prev.length + 1, text: "" }]);

  const updateStep = (id: string, text: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));

  const deleteStep = (id: string) =>
    setSteps((prev) => prev.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 })));

  // --- Save handler ---
  const handleSave = async () => {
    if (!title.trim()) return;

    const base: Partial<Recipe> = {
      title: title.trim(),
      description: description.trim(),
      totalTimeMin: totalTimeMin === "" ? undefined : Number(totalTimeMin),
      ingredients,
      steps,
      updatedAt: Date.now(),
    };

    if (recipe?.id) {
      await db.recipes.update(recipe.id, base);
    } else {
      const newRecipe: Recipe = {
        id: uuidv4(),
        ...base,
        createdAt: Date.now(),
        servings: 1,
        tags: [],
        categories: [],
        ingredients,
        steps,
        updatedAt: Date.now(),
      } as Recipe;
      await db.recipes.add(newRecipe);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {recipe ? t("recipeDialog.editTitle") : t("recipeDialog.addTitle")}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* --- Basic fields --- */}
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

          {/* --- Ingredients --- */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{t("recipeDialog.ingredients")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {ingredients.map((ing) => (
                  <Box key={ing.id} sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      label={t("recipeDialog.ingredientName")}
                      value={ing.name}
                      onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label={t("recipeDialog.quantity")}
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(ing.id, "quantity", e.target.value)}
                      sx={{ width: 140 }}
                    />
                    <IconButton onClick={() => deleteIngredient(ing.id)}>
                      <Delete />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  startIcon={<Add />}
                  onClick={addIngredient}
                  variant="outlined"
                  size="small"
                >
                  {t("recipeDialog.addIngredient")}
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* --- Steps --- */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{t("recipeDialog.steps")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {steps.map((s) => (
                  <Box key={s.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <Typography variant="body2" sx={{ width: 20 }}>
                      {s.order}.
                    </Typography>
                    <TextField
                      label={t("recipeDialog.stepText")}
                      value={s.text}
                      onChange={(e) => updateStep(s.id, e.target.value)}
                      multiline
                      fullWidth
                    />
                    <IconButton onClick={() => deleteStep(s.id)}>
                      <Delete />
                    </IconButton>
                  </Box>
                ))}
                <Button startIcon={<Add />} onClick={addStep} variant="outlined" size="small">
                  {t("recipeDialog.addStep")}
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button onClick={handleSave} variant="contained">
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}