# My Recipes — Functional Specification

## Overview
This application is a **recipe management tool** designed for users who want to collect, organize, view, and edit their cooking recipes. It provides an intuitive interface to browse recipes, add new ones, and keep ingredients and steps structured in a clear format.  

The app is built to run as a **progressive web app (PWA)**, meaning it can be used both online and offline and installed on mobile or desktop devices.

---

## Core Features

### 1. Recipe Library
- Displays all saved recipes in a clean, scrollable list.
- Each recipe entry shows its title, thumbnail image, and basic tags (like “vegetarian,” “quick,” or “dessert”).
- Users can search through the entire recipe collection using keywords (title, tags, or ingredients).

### 2. Recipe Details
- Selecting a recipe opens a **detail view** showing:
  - Recipe image
  - Title and short description
  - List of ingredients with quantities
  - Step-by-step cooking instructions
- Tags are shown for easy filtering (e.g., “vegan,” “under 30 minutes”).
- From this view, users can edit or delete the recipe.

### 3. Add and Edit Recipes
- A dedicated dialog allows creating or updating recipes.
- Each recipe includes:
  - Title and description
  - Ingredients list (editable line-by-line)
  - Preparation steps (with support for reordering)
  - Optional image upload
  - Tags for categorization
- Changes are instantly reflected in the recipe list.

### 4. Recipe Import and Synchronization
- The app supports **recipe import** from external sources (files or text).
- A background **auto-sync feature** keeps recipes up to date between devices, notifying users through a small toast message.

### 5. Settings
- A **Settings page** allows users to configure preferences such as theme (light/dark) and synchronization behavior.
- Users can manage local data and potentially link to external storage.

---

## User Experience
- **Simple and responsive layout**, optimized for both desktop and mobile.
- Uses consistent color themes and large touch-friendly buttons.
- Provides instant feedback through dialogs and toast notifications.
- Designed for **offline use**, syncing changes when connection is restored.

---

## Directory Overview

| Path | Description |
|------|--------------|
| `/public/` | Contains app icons and public assets for PWA installation. |
| `/src/app/` | Defines global layout and navigation structure (`AppLayout.tsx`). |
| `/src/providers/` | Provides app-wide context such as theming (`AppThemeProvider.tsx`). |
| `/src/features/recipes/` | Main recipe management feature: list, detail, add/edit dialogs. |
| `/src/features/recipes/components/` | Reusable UI parts like ingredient and step editors, tag input, and image picker. |
| `/src/features/recipes/hooks/` | Custom hooks for managing recipes, searching, forms, and tags. |
| `/src/features/settings/` | Settings screen for preferences (`SettingsPage.tsx`). |
| `/src/features/sync/` | Handles synchronization and sync notifications (`AutoSyncToast.tsx`). |
| `/src/features/import/` | Logic for importing recipe data from external sources. |
| `/src/types/` | Defines data structures for recipes, images, and sync state. |
| `/src/main.tsx` | Entry point of the app — mounts the main layout and initializes providers. |
| `package.json` | Lists dependencies and scripts used to run or build the app. |
| `vite.config.ts` | Configuration for the build system (Vite). |
| `README.md` | Developer notes and quickstart guide. |

---

## File Highlights
- **`RecipesPage.tsx`** — Displays and manages the list of recipes.
- **`RecipeDetail.tsx`** — Shows full recipe details with editing options.
- **`IngredientsEditor.tsx`** — Inline editor for managing ingredient lists.
- **`SettingsPage.tsx`** — Interface for adjusting user preferences.
- **`AutoSyncToast.tsx`** — Displays notifications when automatic sync occurs.

---

## Summary
Overall, the application provides a clean and user-friendly way to store, browse, and manage recipes locally, with synchronization and offline support. It is designed for everyday home cooking, offering just enough flexibility for editing and organizing recipes while keeping the interface approachable for non-technical users.