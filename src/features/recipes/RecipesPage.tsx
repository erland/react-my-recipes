import React from "react";
import {
  Box,
  Stack,
  TextField,
  Typography,
  ListItemButton,
  Slider,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { Add, Edit, Favorite, FavoriteBorder } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useRecipeSearch } from "@/hooks/useRecipeSearch";
import { Link } from "react-router-dom";
import RecipeDialog from "./RecipeDialog";
import type { Recipe } from "@/types/recipe";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { db } from "@/db/schema";
import { importRecipeFromUrl } from "@/features/import/urlImport";
import { importRecipeFromPaste } from "@/features/import/pasteParser";

export default function RecipesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [maxTime, setMaxTime] = React.useState(180);

  const debouncedSearch = useDebouncedValue(search, 250);
  const recipes = useRecipeSearch({ query: debouncedSearch, maxTime });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRecipe, setEditingRecipe] = React.useState<Recipe | null>(null);

  // Add / Import menu
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  // URL import dialog
  const [urlOpen, setUrlOpen] = React.useState(false);
  const [importUrl, setImportUrl] = React.useState("");
  const [busyUrl, setBusyUrl] = React.useState(false);

  // Paste import dialog
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");
  const [busyPaste, setBusyPaste] = React.useState(false);

  const handleAddManual = () => {
    setEditingRecipe(null);
    setDialogOpen(true);
  };

  const handleEdit = (r: Recipe) => {
    setEditingRecipe(r);
    setDialogOpen(true);
  };

  async function runUrlImport() {
    if (!importUrl.trim()) return;
    setBusyUrl(true);
    try {
      const rec = await importRecipeFromUrl(importUrl.trim());
      await db.recipes.add(rec);
      setUrlOpen(false);
      setImportUrl("");
      // Let user tweak immediately
      setEditingRecipe(rec);
      setDialogOpen(true);
    } catch (e: any) {
      alert(e?.message || String(t("recipes.importError")));
    } finally {
      setBusyUrl(false);
    }
  }

  async function runPasteImport() {
    if (!pasteText.trim()) return;
    setBusyPaste(true);
    try {
      const rec = importRecipeFromPaste(pasteText.trim());
      await db.recipes.add(rec);
      setPasteOpen(false);
      setPasteText("");
      setEditingRecipe(rec);
      setDialogOpen(true);
    } catch (e: any) {
      alert(e?.message || String(t("recipes.importError")));
    } finally {
      setBusyPaste(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t("recipes.title")}</Typography>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label={t("recipes.searchEverything")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Box>
            <Typography variant="body2" gutterBottom>
              {t("recipes.maxTotalTime", {
                minutes: maxTime === 180 ? "180+" : maxTime,
              })}
            </Typography>
            <Slider
              value={maxTime}
              onChange={(_, v) => setMaxTime(v as number)}
              valueLabelDisplay="auto"
              step={5}
              min={0}
              max={180}
            />
          </Box>
        </Stack>
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
              <React.Fragment key={r.id}>
                <ListItem divider disablePadding>
                  <ListItemButton component={Link} to={`/recipes/${r.id}`}>
                    <ListItemText
                      primary={r.title}
                      secondary={r.totalTimeMin ? `${r.totalTimeMin} min` : t("recipes.noTime")}
                    />
                  </ListItemButton>
                  <ListItemSecondaryAction>
                    <Tooltip
                      title={r.favorite ? t("recipes.unfavorite") : t("recipes.favorite")}
                    >
                      <IconButton
                        size="small"
                        onClick={async (e) => {
                          e.preventDefault();
                          await db.recipes.update(r.id, { favorite: !r.favorite });
                        }}
                        aria-label={r.favorite ? t("recipes.unfavorite") : t("recipes.favorite")}
                      >
                        {r.favorite ? <Favorite /> : <FavoriteBorder />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("recipes.edit")}>
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          handleEdit(r);
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
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
      <RecipeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} recipe={editingRecipe} />

      {/* URL import dialog */}
      <Dialog open={urlOpen} onClose={() => !busyUrl && setUrlOpen(false)} fullWidth>
        <DialogTitle>{t("recipes.importFromUrl")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t("recipes.importUrlLabel")}
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://…"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUrlOpen(false)} disabled={busyUrl}>
            {t("common.cancel")}
          </Button>
          <Button onClick={runUrlImport} disabled={busyUrl} variant="contained">
            {busyUrl ? <CircularProgress size={20} /> : t("recipes.import")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Paste import dialog */}
      <Dialog open={pasteOpen} onClose={() => !busyPaste && setPasteOpen(false)} fullWidth>
        <DialogTitle>{t("recipes.importFromPaste")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={6}
            label={t("recipes.pasteLabel")}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`${t("recipes.pasteExampleTitle")}\n${t("recipes.pasteExampleIng")}\n- Mjölk – 6 dl\n- Ägg – 3 st\n${t("recipes.pasteExampleSteps")}\n1. Vispa ihop …`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasteOpen(false)} disabled={busyPaste}>
            {t("common.cancel")}
          </Button>
          <Button onClick={runPasteImport} disabled={busyPaste} variant="contained">
            {busyPaste ? <CircularProgress size={20} /> : t("recipes.import")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}