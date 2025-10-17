import React from "react";
import {
  Box,
  Stack,
  TextField,
  Typography,
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
import { fullName } from "@/utils/nameUtils"; // future placeholder, optional

export default function RecipesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [maxTime, setMaxTime] = React.useState(180);

  const recipes = useRecipeSearch({ query: search, maxTime });

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
                <ListItem divider>
                  <ListItemText
                    primary={r.title}
                    secondary={
                      r.totalTimeMin
                        ? `${r.totalTimeMin} min`
                        : t("recipes.noTime")
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title={t("recipes.edit")}>
                      <IconButton color="primary">
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
            <IconButton color="primary" size="large">
              <Add />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </Stack>
  );
}