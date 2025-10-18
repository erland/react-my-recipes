# Recipe PWA – Step‑by‑Step Development Plan (LLM‑Friendly)

This plan is optimized for fast, reliable delivery of v1.0 based on your specification (single Recipes view with global search, **max total time** slider, create/edit in the list, delete in the detail view, offline‑first PWA, Google Drive sync, **Swedish first** localization).

---

## 0) Foundation & Scaffolding (Day 0–1)

- **Tooling & Stack**
  - Vite (React + TypeScript), Vitest + Testing Library, Playwright
  - ESLint + Prettier
  - `vite-plugin-pwa` for the service worker & manifest
  - React Router, MUI, Dexie (IndexedDB), Fuse.js, i18next
- **Project Skeleton**
  - `src/app/` – app shell, routes, PWA setup  
  - `src/db/` – Dexie schema & data access  
  - `src/features/recipes/` – list, detail, editor, hooks  
  - `src/sync/` – Google Drive auth + sync engine  
  - `src/i18n/` – `sv-SE` default + future locales
- **PWA Shell**
  - App manifest, icons, install prompt, SW registration
  - Workbox strategies (SWR for app shell; Cache‑First for images)
- **CI/Smoke Tests**
  - Run unit & E2E stubs in CI
  - Minimal route/render tests for `/recipes`, `/recipes/:id`, `/settings`

**Deliverables:** Running app shell with routes and Swedish as the default language.

---

## 1) Data Model & IndexedDB (Day 1)

- **Types**: `Recipe`, `IngredientRef`, `RecipeStep`, `ImageAsset`
- **Dexie Schema**
  - Tables: `recipes`, `images`, `syncState`
  - Indexes: by `updatedAt`, `favorite`, and searchable fields
  - Default list ordering: `updatedAt` desc
- **Hooks**
  - `useRecipesQuery({ search, maxTime })` with live queries

**Tests:** Type guards, Dexie CRUD, migrations (if any).

---

## 2) Recipes List – Core UX (Day 2–3)

- **UI**
  - Search input (“Search everything…”)
  - **Max Total Time slider** (0–180 with a terminal “180+” bucket)
  - Recipe cards: image (lazy), title, total time (if known), tags, favorite toggle
  - **Create** (+) and **Edit** (pencil) available directly on cards  
    (both open the same `RecipeEditorDialog`)
- **Search Logic (Fuse.js)**
  - Weighted keys: `title`, `ingredients.name`, `tags`, `categories`, `description`, `steps.text`, `sourceName`, `notes`
  - Debounce: 200–300 ms
- **Time Filter Semantics**
  - `effectiveTotalMin = totalTimeMin ?? (prepTimeMin + cookTimeMin)`
  - When slider < **180+**: hide recipes that lack a computable total
  - At **180+**: show all (even those without total)
- **Ordering**
  - Always `updatedAt` desc (no sort UI)

**Tests:** Search merges across fields, debounce works, time filter rules, ordering, create/edit bumps `updatedAt` and moves card to top.

---

## 3) Recipe Detail (Day 4)

- **View**
  - Title, hero image/gallery
  - times, steps, tags/categories/allergens, source, notes, favorite
- **Delete Policy**
  - **Delete only from detail view** (trash in app bar → confirm → navigate back)
  - Optional Edit button (opens the same dialog)

**Tests:** Deletion removes the recipe and returns to list.

---

## 4) Import & Export (Day 5)

- **URL Import (schema.org JSON‑LD)**
  - Fetch page → extract `Recipe` object (title, ingredients, steps, times, image URL, source)
  - MVP parser with defensive fallbacks and user‑friendly error messages
- **Paste‑In Parser**
  - Plain text format: title / ingredients / steps
- **Export/Backup**
  - JSON (or ZIP: recipes.json + images/)
  - Buttons in **Settings**

**Tests:** Round‑trip export/import; malformed input shows actionable errors; image handling verified.

---

## 5) Cloud Sync (Backend‑less) — Google Drive MVP (Day 6–7)

- **Auth**
  - OAuth2 PKCE in browser; tokens in IndexedDB
  - Settings: “Choose account”, **Sync now**, auto‑sync toggle
- **Drive Layout**
  - `/RecipeBox/db/recipes.json` (LWW per field with `updatedAt`)
  - `/RecipeBox/images/<id>.webp`
- **Sync Strategy**
  - On startup and on network regain, reconcile local vs cloud
  - Per‑recipe Last‑Write‑Wins (LWW)
  - Batched image uploads
  - Non‑blocking error banner with “Try again”
- **Future Sharing**
  - Keep path configurable to support shared folders later

**Tests:** Offline edits → reconnect → LWW wins; token refresh; partial‑failure recovery paths.

---

## 6) PWA Offline & Storage Durability (Day 7)

- **Workbox Config**
  - App shell: Stale‑While‑Revalidate
  - Images: Cache‑First with size/age limits
  - Request persistent storage via `navigator.storage.persist()`
- **Audit**
  - Lighthouse passes PWA checks
  - Full offline usage verified (list/detail/edit)

---

## 7) i18n & Accessibility (Day 8)

- **Language**
  - Ship with **sv‑SE** as default
  - Settings: language switcher (architecture prepared for more locales)
- **A11y**
  - Keyboard flows & focus management
  - ARIA labels and contrast targets (WCAG AA)
  - MUI defaults + targeted improvements

**Tests:** Translation keys coverage; basic accessibility assertions.

---

## 8) Performance, QA, and E2E (Day 9)

- **Budgets**
  - Initial JS < **200 kB** gzip (aim)
  - Route‑level code splitting; lazy load editor/importers
  - LCP < **2.5s** on mid‑range mobile
- **Playwright E2E**
  - Create/edit/delete
  - Search + time filter behavior
  - Import/export flow
  - Offline → online sync flow

---

## 9) Release (Day 10)

- **Branding**
  - App name, icons, theme color
  - Privacy note (client‑only data by default)
- **Deploy**
  - Static hosting (e.g., Netlify/Vercel) + OAuth redirect URIs
  - Tag v1.0
- **Docs**
  - Quickstart & backup/sync guidance
  - Known limitations

---

## What I’ll Implement First (File‑by‑File)

1) **DB & Models**
   - `src/db/schema.ts` – Dexie tables + indexes  
   - `src/types/recipe.ts` – TS interfaces

2) **Search & Filter Hook**
   - `src/features/recipes/useRecipeSearch.ts` – Fuse index (weights), 200–300 ms debounce, **max‑time** logic

3) **Recipes List UI**
   - `src/features/recipes/RecipesPage.tsx` – search, slider, cards, Create/Edit dialog integration  
   - `src/features/recipes/RecipeEditorDialog.tsx` – shared dialog

4) **Detail View**
   - `src/features/recipes/RecipeDetail.tsx` – detail + **Delete** only (confirm)

5) **Import/Export**
   - `src/features/import/urlImport.ts` – JSON‑LD extraction  
   - `src/features/import/pasteParser.ts` – text parser  
   - `src/features/export/jsonZip.ts` – backup

6) **Sync (Drive)**
   - `src/sync/googleDriveClient.ts` – auth + file ops  
   - `src/sync/syncEngine.ts` – LWW merge + checkpoints

7) **PWA**
   - `vite.config.ts` – PWA plugin & Workbox strategies  
   - Request persistent storage

---

## Risks & Mitigations

- **OAuth in PWA**
  - Use PKCE + dedicated Auth screen; handle popup blockers; robust error toasts
- **LWW Correctness**
  - Per‑field timestamps; only touch `updatedAt` for changed fields
- **Image Sizes**
  - Compress to WebP ~1600 px; lazy‑load to satisfy perf budgets

---

## Acceptance Checklist (MVP)

- Global search across all relevant fields with < 300 ms response
- **Max total time** slider: strict filtering < 180; inclusive at 180+
- Create/Edit from list moves recipe to top (via `updatedAt`)
- **Delete only** from detail view with confirmation
- Full offline behavior; background sync on reconnect

---

## Inputs Needed from You

- Google OAuth client (web) + redirect URIs
- App name/icon + Swedish copy review
- A few sample recipes for test fixtures
- Preferred initial Drive folder location (App Folder vs user‑visible)
