import React from "react";
import { useTranslation } from "react-i18next";
import type { Recipe } from "@/types/recipe";
import * as recipesService from "@/services/recipesService";
import { importRecipeFromUrl } from "@/features/import/urlImport";
import { importRecipeFromPaste } from "@/features/import/pasteParser";

/**
 * Encapsulates URL & Paste import flows:
 * - dialog open/close state
 * - parsing/importing
 * - persistence via recipesService
 * - emits the imported recipe to parent via onImported
 */
export default function useRecipeImports(onImported: (recipe: Recipe) => void) {
  const { t } = useTranslation();
  const [urlOpen, setUrlOpen] = React.useState(false);
  const [pasteOpen, setPasteOpen] = React.useState(false);

  const openUrl = () => setUrlOpen(true);
  const closeUrl = () => setUrlOpen(false);
  const openPaste = () => setPasteOpen(true);
  const closePaste = () => setPasteOpen(false);

  const submitUrl = async (url: string) => {
    if (!url.trim()) return;
    try {
      const rec = await importRecipeFromUrl(url.trim());
      await recipesService.insertImportedRecipe(rec);
      closeUrl();
      onImported(rec);
    } catch (e: any) {
      alert(e?.message || String(t("recipes.importError"))); // consider Snackbar later
    }
  };

  const submitPaste = async (text: string) => {
    if (!text.trim()) return;
    try {
      const rec = importRecipeFromPaste(text.trim());
      await recipesService.insertImportedRecipe(rec);
      closePaste();
      onImported(rec);
    } catch (e: any) {
      alert(e?.message || String(t("recipes.importError"))); // consider Snackbar later
    }
  };

  return { urlOpen, openUrl, closeUrl, submitUrl, pasteOpen, openPaste, closePaste, submitPaste };
}