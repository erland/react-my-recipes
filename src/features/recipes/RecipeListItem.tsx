import React from "react";
import {
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Star, StarBorder, Edit } from "@mui/icons-material";
import RecipeThumb from "@/features/recipes/components/RecipeThumb";
import type { Recipe } from "@/types/recipe";

export type RecipeListItemProps = {
  recipe: Recipe;
  onClick?: (id: string) => void;
  onEdit?: (id: string) => void;
  onToggleFavorite?: (id: string, next: boolean) => void;
};

export default function RecipeListItem({ recipe, onClick, onEdit, onToggleFavorite }: RecipeListItemProps) {
  const fav = !!(recipe as any).favorite;
  const id = (recipe as any).id as string;
  const primaryImageId = (recipe as any).imageIds?.[0] ?? null;

  return (
    <ListItem
      secondaryAction={
        <>
          <Tooltip title={fav ? "Unfavorite" : "Favorite"}>
            <IconButton edge="end" onClick={() => onToggleFavorite?.(id, !fav)}>
              {fav ? <Star /> : <StarBorder />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton edge="end" onClick={() => onEdit?.(id)}>
              <Edit />
            </IconButton>
          </Tooltip>
        </>
      }
    >
      <ListItemButton onClick={() => onClick?.(id)}>
        <ListItemAvatar>
          <RecipeThumb title={recipe.title || ""} imageId={primaryImageId} />
        </ListItemAvatar>
        <ListItemText
          primary={recipe.title}
          secondary={recipe.totalTimeMin ? `${recipe.totalTimeMin} min` : undefined}
        />
      </ListItemButton>
    </ListItem>
  );
}