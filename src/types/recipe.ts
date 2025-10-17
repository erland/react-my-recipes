export interface ImageAsset {
  id: string;                // UUID
  blobUrl?: string;          // local URL (for previews)
  driveId?: string;          // for Google Drive sync
  fileName?: string;
  updatedAt: number;
}

export interface IngredientRef {
  id: string;                // internal ref (for linking later if needed)
  name: string;
  quantity?: string;
  note?: string;
}

export interface RecipeStep {
  id: string;
  order: number;
  text: string;
  durationMin?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  servings?: number;
  prepTimeMin?: number;
  cookTimeMin?: number;
  totalTimeMin?: number;
  favorite?: boolean;
  tags?: string[];
  categories?: string[];
  allergens?: string[];
  ingredients?: IngredientRef[];
  steps?: RecipeStep[];
  imageIds?: string[];
  sourceUrl?: string;
  sourceName?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}