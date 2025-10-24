import Dexie, { Table } from "dexie";
import type { Recipe } from "@/types/recipe";
import type { ImageAsset } from "@/types/image"
import type { SyncState } from "@/types/sync";
import { v4 as uuidv4 } from "uuid";

export class RecipeDB extends Dexie {
  recipes!: Table<Recipe, string>;
  images!: Table<ImageAsset, string>;
  syncState!: Table<SyncState, string>;

  constructor() {
    super("recipeDB");

    // Existing v2 schema (kept for upgrade path)
    this.version(2).stores({
      recipes: "id, title, updatedAt, favorite, *tags, *categories, totalTimeMin, cookTimeMin, prepTimeMin",
      images: "id, updatedAt",
      syncState: "id, lastSyncAt", // id = "google-drive"
    });

    // v3: add indexes for driveId and deletedAt to support per-image sync + tombstones
    this.version(3).stores({
      recipes: "id, title, updatedAt, favorite, *tags, *categories, totalTimeMin, cookTimeMin, prepTimeMin",
      images: "id, updatedAt, driveId, deletedAt",
      syncState: "id, lastSyncAt",
    }).upgrade(() => {
      // No data transform needed; new indexes are added automatically.
      // Existing images will simply have undefined driveId/deletedAt until used.
    });

    this.recipes.hook("creating", (pk, obj) => {
      if (!obj.id) obj.id = uuidv4();
      if (!obj.createdAt) obj.createdAt = Date.now();
      obj.updatedAt = Date.now();
    });

    this.recipes.hook("updating", (mods) => {
      (mods as Record<string, unknown>).updatedAt = Date.now();
      return mods;
    });
  }

  async clearAll() {
    await this.transaction("rw", this.recipes, this.images, async () => {
      await this.recipes.clear();
      await this.images.clear();
    });
  }

  async seedDemoData() {
    const now = Date.now();
    const demoRecipes: Recipe[] = [
      {
        id: "demo-1",
        title: "Pannkakor",
        description: "Klassiska svenska pannkakor med sylt.",
        servings: 4,
        prepTimeMin: 10,
        cookTimeMin: 15,
        totalTimeMin: 25,
        ingredients: [
          { id: uuidv4(), name: "Mjölk", quantity: "6 dl" },
          { id: uuidv4(), name: "Mjöl", quantity: "2,5 dl" },
          { id: uuidv4(), name: "Ägg", quantity: "3 st" },
        ],
        steps: [
          { id: uuidv4(), order: 1, text: "Vispa ihop mjöl och mjölk." },
          { id: uuidv4(), order: 2, text: "Tillsätt äggen och vispa slätt." },
          { id: uuidv4(), order: 3, text: "Stek tunna pannkakor i smör." },
        ],
        tags: ["svenskt", "snabbt"],
        categories: ["middag", "dessert"],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-2",
        title: "Köttbullar",
        description: "Hemlagade köttbullar med potatismos.",
        servings: 4,
        prepTimeMin: 20,
        cookTimeMin: 20,
        totalTimeMin: 40,
        ingredients: [
          { id: uuidv4(), name: "Blandfärs", quantity: "500 g" },
          { id: uuidv4(), name: "Lök", quantity: "1 st" },
          { id: uuidv4(), name: "Ägg", quantity: "1 st" },
        ],
        steps: [
          { id: uuidv4(), order: 1, text: "Hacka löken och blanda färsen." },
          { id: uuidv4(), order: 2, text: "Forma små bollar och stek gyllenbruna." },
        ],
        tags: ["klassiker"],
        categories: ["middag"],
        createdAt: now,
        updatedAt: now,
      },
    ];
    await this.recipes.bulkAdd(demoRecipes.map((r) => ({ ...r, createdAt: now, updatedAt: now })));
  }
}

export const db = new RecipeDB();