import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import TagsInput from "./components/TagsInput";
import { useAllTags } from "./hooks/useAllTags";
import { useTranslation } from "react-i18next";
import type { Recipe } from "@/types/recipe";

import ImagePicker from "@/features/recipes/components/ImagePicker";
import IngredientsEditor from "@/features/recipes/components/IngredientsEditor";
import StepsEditor from "@/features/recipes/components/StepsEditor";
import { useRecipeForm } from "@/features/recipes/hooks/useRecipeForm";

interface RecipeDialogProps {
  open: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
  /** Called with form data. Parent decides create vs update. */
  onSave: (data: Partial<Recipe>, existingId?: string) => Promise<void> | void;
}

export default function RecipeDialog({ open, onClose, recipe, onSave }: RecipeDialogProps) {
  const { t } = useTranslation();

  const {
    title, setTitle,
    description, setDescription,
    totalTimeMin, setTotalTimeMin,
    tags, setTags,
    ingredients, steps,
    imageId, setImageId,
    addIngredient, updateIngredient, deleteIngredient,
    addStep, updateStep, deleteStep,
    toPartial,
  } = useRecipeForm(recipe);

  // suggestions from existing recipes
  const allTags = useAllTags();

  const handleSave = async () => {
    if (!title.trim()) return;
    const base = toPartial();
    await onSave(base, recipe?.id);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {recipe ? t("recipeDialog.editTitle") : t("recipeDialog.addTitle")}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Tags */}
          <TagsInput
            value={tags}
            onChange={setTags}
            suggestions={allTags}
            label={t("recipeDialog.tags")}
            placeholder={t("recipeDialog.tagsPlaceholder")}
          />
          {/* Image */}
          <ImagePicker imageId={imageId} onChange={setImageId} title={title} />

          {/* Basic fields */}
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
            onChange={(e) => setTotalTimeMin(e.target.value === "" ? "" : Number(e.target.value))}
            InputProps={{ inputProps: { min: 0 } }}
            fullWidth
          />

          {/* Ingredients */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{t("recipeDialog.ingredients")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <IngredientsEditor
                ingredients={ingredients}
                onAdd={addIngredient}
                onChange={updateIngredient}
                onDelete={deleteIngredient}
              />
            </AccordionDetails>
          </Accordion>

          {/* Steps */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{t("recipeDialog.steps")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <StepsEditor
                steps={steps}
                onAdd={addStep}
                onChange={updateStep}
                onDelete={deleteStep}
              />
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