import React from 'react';
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { RecipeStep } from '@/types/recipe';

export type StepsEditorProps = {
  steps: RecipeStep[];
  onAdd: () => void;
  onChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
};

export default function StepsEditor({ steps, onAdd, onChange, onDelete }: StepsEditorProps) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      {steps.map((s) => (
        <Box key={s.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Typography variant="body2" sx={{ width: 20 }}>{s.order}.</Typography>
          <TextField
            label={t('recipeDialog.stepText')}
            value={s.text}
            onChange={(e) => onChange(s.id, e.target.value)}
            multiline
            fullWidth
          />
          <IconButton onClick={() => onDelete(s.id)}><Delete /></IconButton>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={onAdd} variant="outlined" size="small">
        {t('recipeDialog.addStep')}
      </Button>
    </Stack>
  );
}