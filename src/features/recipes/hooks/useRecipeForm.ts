import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, IngredientRef, RecipeStep } from '@/types/recipe';

export type UseRecipeForm = ReturnType<typeof useRecipeForm>;

export function useRecipeForm(recipe?: Recipe | null) {
  // Base fields
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [totalTimeMin, setTotalTimeMin] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);

  // Nested
  const [ingredients, setIngredients] = useState<IngredientRef[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);

  // Hero image id
  const [imageId, setImageId] = useState<string | undefined>(undefined);

  // Load/reset from recipe
  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title ?? '');
      setDescription(recipe.description ?? '');
      setTotalTimeMin(recipe.totalTimeMin ?? '');
      setIngredients(recipe.ingredients ?? []);
      setSteps((recipe.steps ?? []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)));
      setImageId(recipe.imageIds?.[0]);
    } else {
      setTitle('');
      setDescription('');
      setTotalTimeMin('');
      setIngredients([]);
      setSteps([]);
      setImageId(undefined);
    }
  }, [recipe]);

  // Ingredient mutators
  const addIngredient = () =>
    setIngredients((prev) => [...prev, { id: uuidv4(), name: '', quantity: '' } as IngredientRef]);

  const updateIngredient = (id: string, field: 'name' | 'quantity', value: string) =>
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const deleteIngredient = (id: string) =>
    setIngredients((prev) => prev.filter((i) => i.id !== id));

  // Step mutators
  const addStep = () =>
    setSteps((prev) => [...prev, { id: uuidv4(), order: prev.length + 1, text: '' } as RecipeStep]);

  const updateStep = (id: string, text: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));

  const deleteStep = (id: string) =>
    setSteps((prev) => prev.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 })));

  // DB payload
  const toPartial = (): Partial<Recipe> => ({
    title: title.trim(),
    description: description.trim(),
    totalTimeMin: totalTimeMin === '' ? undefined : Number(totalTimeMin),
    ingredients,
    steps,
    imageIds: imageId ? [imageId] : [],
    updatedAt: Date.now(),
  });

  // init/patch tags from existing recipe
  useEffect(() => {
    setTags(recipe?.tags ?? []);
  }, [recipe?.id]);
    

  return {
    // state
    title, setTitle,
    description, setDescription,
    totalTimeMin, setTotalTimeMin,
    tags, setTags,
    ingredients, steps, imageId, setImageId,
    // mutators
    addIngredient, updateIngredient, deleteIngredient,
    addStep, updateStep, deleteStep,
    // helpers
    toPartial: () => ({
      title: title?.trim() || undefined,
      description: description?.trim() || undefined,
      totalTimeMin: totalTimeMin === '' ? undefined : Number(totalTimeMin),
      tags,
      ingredients,
      steps,
      imageIds: imageId ? [imageId] : undefined,
    }),
  };      
}