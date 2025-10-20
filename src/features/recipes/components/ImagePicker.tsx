import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { saveImageFile } from '@/services/imagesService';
import { useImageUrl } from '@/hooks/useImageUrl';

export type ImagePickerProps = {
  imageId?: string;
  onChange: (id: string | undefined) => void;
  title: string;
};

export default function ImagePicker({ imageId, onChange, title }: ImagePickerProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const url = useImageUrl(imageId);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const asset = await saveImageFile(file);
      onChange(asset.id);
    } catch (err: any) {
      alert(err?.message || t('imagePicker.error'));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('recipeDialog.image')}</Typography>
      {url ? (
        <Box
          sx={{
            width: '100%',
            height: 260,
            borderRadius: 1,
            mb: 1,
            overflow: 'hidden',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src={url}
            alt={title || 'image'}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            loading="lazy"
          />
        </Box>
      ) : (
        <Box
          sx={{
            height: 120,
            borderRadius: 1,
            bgcolor: 'action.hover',
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
            fontSize: 14,
          }}
        >
          {t('recipeDialog.noImage')}
        </Box>
      )}

      <Stack direction="row" spacing={1}>
        <Button component="label" variant="outlined" size="small" disabled={busy}>
          {url ? t('recipeDialog.changeImage') : t('recipeDialog.addImage')}
          <input type="file" hidden accept="image/*" onChange={onPickFile} />
        </Button>
        {url && (
          <Button onClick={() => onChange(undefined)} size="small" color="inherit" disabled={busy}>
            {t('recipeDialog.removeImage')}
          </Button>
        )}
      </Stack>
    </Box>
  );
}