# Recipe PWA — Requirements Specification v1.0 (updated)

> **Summary:** An offline-first PWA to save, find, and cook favorite recipes. A single **Recipes** view with an **“search everything”** input and a **max total time filter** (slider). Create/Edit from the list; Delete from the detail view. No pantry or shopping list in v1.0. Sync is backend-less via the user’s cloud storage.  
> **Language:** The app **ships with Swedish (sv-SE) first** and is **i18n-ready** to add more languages later.

---

## 1) Overview & Goals
- Quickly **find favorite recipes** with a single global search.
- **Pick recipes by time** using a max total time slider.
- **Work offline** and sync changes via a chosen cloud provider when online.
- **Family sharing** by using a shared folder in the provider.
- **No custom backend** — all logic runs on the client.

## 2) Scope (v1.0)
**Included**
- Recipe CRUD: create, read, edit (in list), delete (in detail).
- Recipes list with **search everything** + **max total time** filter.
- Favorite flag on recipes
- Import from URL (schema.org JSON-LD) and paste-in text; export/backup (JSON/ZIP).
- Offline-first PWA and cloud sync (one provider in MVP).

## 3) Navigation & Screens
- **Tabs (mobile):** Recipes • More
- **Routes:**
  - `/recipes` — Recipes list (search, max-time, create/edit)
  - `/recipes/:id` — Detail (view, delete, optional edit)
  - `/settings` — Settings (sync, import/export, theme/language)

## 4) Primary Flows & Behaviors
### 4.1 Recipes list (main screen)
- **Search field:** “Search everything…” (debounce ~200–300 ms). Matches title, description, ingredients, steps, tags, categories, source, and notes.
- **Filter: Max total time** via slider:
  - Range: **0–180 min** with a final step **180+** (interpreted as unlimited).
  - **Total time definition:**  
    `effectiveTotalMin = totalTimeMin ?? (prepTimeMin + cookTimeMin)`.
  - **Filter rule:** Show only recipes with `effectiveTotalMin ≤ selectedMax`. If a recipe’s `effectiveTotalMin` is unknown, it is hidden when `selectedMax < 180+`.
- **Cards list:** image, title, (total time if known), a few tags, favorite icon.
- **Actions:**
  - **Create** — FAB (+) or app-bar button → opens dialog.
  - **Edit** — pencil on each card → same dialog pre-filled.
  - **Open** — tap card → detail view.
- **Default ordering:** Most recently updated first (no visible sort control).

### 4.2 Recipe detail
- Title, images, times (prep/cook/total), steps, tags, categories, allergens, source, notes, rating, favorite.
- **Delete** — trash icon in app bar → confirm dialog → returns to list.
- **Edit** — button/icon opens the same dialog as in the list.

### 4.3 Import/Export
- **URL import:** Pull schema.org/JSON-LD “Recipe” (title, ingredients, steps, times, image URL, source).
- **Paste text:** Simple parser (title + ingredients + steps).
- **Export/Backup:** JSON/ZIP (recipes + images).

### 4.4 Settings
- Choose cloud provider & account, “Sync now”, auto-update.
- Export/Import.
- Theme (light/dark), **Language** (Swedish default; see i18n below).

## 5) Acceptance Criteria (summary)
**Recipes list — “search everything”**
- Typing in the search field filters the list within 300 ms across all fields.
- An empty search shows all recipes (by default ordering) within the current max-time.

**Recipes list — max total time**
- Adjusting the slider updates the list immediately.
- Recipes without known total time are hidden when the slider is under 180+.
- At 180+ all recipes are shown regardless of missing total time.

**Create/Edit in list**
- Pressing + opens a dialog; saving creates the recipe; the list updates and shows it at the top.
- Pencil on a card opens the dialog with current values; saving updates the recipe and moves it to the top.

**Delete in detail**
- Delete shows confirmation; on OK the recipe is removed and the list no longer shows it.

**Offline & sync**
- The app opens, lists, searches, and shows recipes **offline**.
- When the network returns, changes are synced to the cloud folder.

## 6) Non-functional Requirements
- **Performance:** LCP < 2.5 s on mid-range mobile; initial JS < 200 kB gzip (code-split).
- **Accessibility:** WCAG AA (keyboard, ARIA, contrast, focus).
- **Privacy:** All data local + in the user’s cloud folder; no third-party backend.
- **Quality:** Unit/hook tests for critical logic; E2E for flows (Playwright).

## 7) Future (out of v1.0)
- Pantry, Shopping list, Meal planning.
- CRDT sync and end-to-end encryption (E2E).
- Pantry.
- Shopping list.
- Meal planning.
- Ratings on recipes
- Servings (scaling) in recipe detail

---

# Technical Specification (separate)

## A) Architecture & Frameworks
- **PWA:** React 18 + TypeScript + Vite + `vite-plugin-pwa`.
- **UI:** MUI 6 (touch-optimized, light/dark theme).
- **State & data:** Dexie/IndexedDB (live queries), minimal global state.
- **Search:** Fuse.js (local index) with UI debounce.
- **Routing:** React Router.

## B) Data Model (TypeScript)
```ts
type ID = string;

export interface IngredientRef {
  name: string;
  quantity?: string;
  optional?: boolean;
  notes?: string;
}

export interface RecipeStep { id: ID; text: string; }

export interface Recipe {
  id: ID;
  title: string;
  description?: string;
  imageIds: ID[];
  tags: string[];
  categories: string[];
  allergens: string[];
  totalTimeMin?: number;
  prepTimeMin?: number;
  cookTimeMin?: number;
  difficulty?: "easy" | "medium" | "hard";
  ingredients: IngredientRef[];
  steps: RecipeStep[];
  sourceUrl?: string;
  sourceName?: string;
  favorite?: boolean;
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms
  lastCookedAt?: string;
  notes?: string;
}

export interface ImageAsset {
  id: ID; mime: string; width: number; height: number;
  localBlobRef?: string; cloudPath?: string;
}
```

## C) Storage & Indexing
- **Dexie tables:**
  - `recipes` — indexes: `id`, `title`, `updatedAt`, `favorite`, `*tags`, `*categories`, `totalTimeMin`, `prepTimeMin`, `cookTimeMin`.
  - `images` — binary blobs/metadata.
  - `lexicon` — optional alias register for ingredient normalization.
  - `syncState` — versions, checkpoints, provider info.
- **Default UI order:** `updatedAt` descending via `orderBy("updatedAt").reverse()`.

## D) Search & Filter Logic
- **Fuse.js** example config:
  - `threshold: 0.35`, `ignoreLocation: true`.
  - Keys & weights: `title:3`, `ingredients.name:2.5`, `tags:1.5`, `categories:1.5`, `description:1`, `steps.text:1`, `sourceName:1`, `notes:1`.
- **Debounce:** 200–300 ms.
- **Max-time filter:**
  - `effectiveTotalMin = totalTimeMin ?? ((prepTimeMin ?? 0) + (cookTimeMin ?? 0) || undefined)`.
  - Slider: 0–180 (step 5); final position **180+** ⇒ no time filtering.
  - When not at 180+: filter out recipes whose `effectiveTotalMin` is **missing** or `>` selected value.

## E) Cloud Sync (backend-less)
- **MVP provider:** Google Drive (App folder), later OneDrive/Dropbox.
- **File layout:** `/RecipeBox/db/recipes.json` (LWW) and `/RecipeBox/images/<id>.webp`.
- **Conflicts:** Last-Write-Wins per recipe (`updatedAt` timestamps).
- **Auth:** OAuth2 PKCE; tokens stored in IndexedDB.

## F) PWA & Offline
- `vite-plugin-pwa` with Workbox:
  - App shell: Stale-While-Revalidate.
  - Images: Cache-First with size/age limits.
  - Request `navigator.storage.persist()` for durable storage.

## G) Images
- Client-side compression (WebP, target width ~1600 px), lazy loading.

## H) Accessibility & i18n
- MUI components with ARIA labels; focus handling; sufficient contrast.
- **Internationalization:**  
  - **Default language:** Swedish (sv-SE).  
  - All user-facing strings externalized to i18n resources.  
  - Language switch in **Settings**; future locales can be added without code changes to business logic.

## I) Testing & Quality
- **Unit/Hook:** Vitest + Testing Library for search, filter, CRUD.
- **E2E:** Playwright — flows: create/edit/delete, search + max-time, import/export.

## J) Error Handling
- Sync errors: non-blocking banner with “try again”.
- Import errors: detailed dialog with manual correction option.

---

## Milestones
**v1.0 (MVP)**
- Recipe CRUD, favorite/rating.
- Recipes list with search + max-time filter; detail with delete.
- Offline-first; Google Drive sync (LWW); import/paste-in; export/backup.

**v1.1**
- OneDrive/Dropbox providers; better import (more sources); image handling improvements.

**v1.2**
- CRDT sync; E2E encryption; smarter recommendations.
