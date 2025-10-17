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
} from "@mui/material";
import { Add, Edit } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useRecipeSearch } from "@/hooks/useRecipeSearch";
import { Link } from "react-router-dom";
import RecipeDialog from "./RecipeDialog";
import type { Recipe } from "@/types/recipe";
import { fullName } from "@/utils/nameUtils"; // future placeholder, optional

export default function RecipesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [maxTime, setMaxTime] = React.useState(180);

  const recipes = useRecipeSearch({ query: search, maxTime });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRecipe, setEditingRecipe] = React.useState<Recipe | null>(null);

  const handleAdd = () => {
    setEditingRecipe(null);
    setDialogOpen(true);
  };

  const handleEdit = (r: Recipe) => {
    setEditingRecipe(r);
    setDialogOpen(true);
  };

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
            <IconButton color="primary" size="large" onClick={handleAdd}>
              <Add />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      <RecipeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        recipe={editingRecipe}
      />
    </Stack>
  );
}