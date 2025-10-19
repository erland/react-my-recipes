import React from 'react';
import { Box, Button, IconButton, Stack, TextField } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { IngredientRef } from '@/types/recipe';

export type IngredientsEditorProps = {
  ingredients: IngredientRef[];
  onAdd: () => void;
  onChange: (id: string, field: 'name' | 'quantity', value: string) => void;
  onDelete: (id: string) => void;
};

export default function IngredientsEditor({ ingredients, onAdd, onChange, onDelete }: IngredientsEditorProps) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      {ingredients.map((ing) => (
        <Box key={ing.id} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label={t('recipeDialog.ingredientName')}
            value={ing.name}
            onChange={(e) => onChange(ing.id, 'name', e.target.value)}
            fullWidth
          />
          <TextField
            label={t('recipeDialog.quantity')}
            value={ing.quantity}
            onChange={(e) => onChange(ing.id, 'quantity', e.target.value)}
            sx={{ width: 140 }}
          />
          <IconButton onClick={() => onDelete(ing.id)}><Delete /></IconButton>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={onAdd} variant="outlined" size="small">
        {t('recipeDialog.addIngredient')}
      </Button>
    </Stack>
  );
}