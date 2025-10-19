import React from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  List,
  Menu,
  MenuItem,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useRecipeSearch } from "@/hooks/useRecipeSearch";
import { useNavigate } from "react-router-dom";
import RecipeDialog from "./RecipeDialog";
import type { Recipe } from "@/types/recipe";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import * as recipesService from "@/services/recipesService";
import { importRecipeFromUrl } from "@/features/import/urlImport";
import { importRecipeFromPaste } from "@/features/import/pasteParser";
import RecipesToolbar from "./RecipesToolbar";
import RecipeListItem from "./RecipeListItem";
import ImportFromUrlDialog from "@/features/import/ImportFromUrlDialog";
import ImportFromPasteDialog from "@/features/import/ImportFromPasteDialog";

export default function RecipesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [maxTimeMin, setMaxTimeMin] = React.useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 250);
  const effectiveMaxTime = maxTimeMin ?? 180;
  const recipes = useRecipeSearch({ query: debouncedSearch, maxTime: effectiveMaxTime });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRecipe, setEditingRecipe] = React.useState<Recipe | null>(null);

  // Add / Import menu
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  // URL import dialog
  const [urlOpen, setUrlOpen] = React.useState(false);

  // Paste import dialog
  const [pasteOpen, setPasteOpen] = React.useState(false);

  const handleAddManual = () => {
    setEditingRecipe(null);
    setDialogOpen(true);
  };

  const handleEdit = (r: Recipe) => {
    setEditingRecipe(r);
    setDialogOpen(true);
  };

  async function handleDialogSave(data: Partial<Recipe>, existingId?: string) {
    if (existingId) {
      await recipesService.updateRecipe(existingId, data);
    } else {
      await recipesService.createRecipe(data);
    }
  }

  async function handleSubmitUrl(url: string) {
    if (!url.trim()) return;
    try {
      const rec = await importRecipeFromUrl(url.trim());
      await recipesService.insertImportedRecipe(rec);
      setUrlOpen(false);
      setEditingRecipe(rec);
      setDialogOpen(true);
    } catch (e: any) {
      alert(e?.message || String(t("recipes.importError")));
    }
  }

  async function handleSubmitPaste(text: string) {
    if (!text.trim()) return;
    try {
      const rec = importRecipeFromPaste(text.trim());
      await recipesService.insertImportedRecipe(rec);
      setPasteOpen(false);
      setEditingRecipe(rec);
      setDialogOpen(true);
    } catch (e: any) {
      alert(e?.message || String(t("recipes.importError")));
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t("recipes.title")}</Typography>

      <Paper sx={{ p: 2 }}>
        <RecipesToolbar
          query={search}
          onQueryChange={setSearch}
          maxTimeMin={maxTimeMin}
          onMaxTimeMinChange={setMaxTimeMin}
        />
      </Paper>

      <Paper sx={{ p: 2 }}>
        {!recipes ? (
          <Typography variant="body2" color="text.secondary">
            {t("recipes.loading")}
          </Typography>
        ) : recipes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("recipes.noResults")}
          </Typography>
        ) : (
          <List>
            {recipes.map((r) => (
              <RecipeListItem
                key={r.id}
                recipe={r as Recipe}
                onClick={(id) => navigate(`/recipes/${id}`)}
                onEdit={(id) => { const rec = (recipes as Recipe[]).find(x => x.id === id); if (rec) { setEditingRecipe(rec); setDialogOpen(true); } }}
                onToggleFavorite={async (id, next) => { await recipesService.setFavorite(id, next); }}
              />
            ))}
          </List>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ textAlign: "center" }}>
          <Tooltip title={t("recipes.addNew")}>
            <IconButton color="primary" size="large" onClick={openMenu}>
              <Add />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
            <MenuItem
              onClick={() => {
                closeMenu();
                handleAddManual();
              }}
            >
              {t("recipes.createManual")}
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu();
                setUrlOpen(true);
              }}
            >
              {t("recipes.importFromUrl")}
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu();
                setPasteOpen(true);
              }}
            >
              {t("recipes.importFromPaste")}
            </MenuItem>
          </Menu>
        </Box>
      </Paper>

      {/* Manual create/edit */}
      <RecipeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        recipe={editingRecipe}
        onSave={handleDialogSave}
      />

      {/* URL import dialog */}
      <ImportFromUrlDialog
        open={urlOpen}
        onClose={() => setUrlOpen(false)}
        onSubmit={handleSubmitUrl}
      />

      {/* Paste import dialog */}
      <ImportFromPasteDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onSubmit={handleSubmitPaste}
      />
    </Stack>
  );
}