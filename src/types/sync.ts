export type CloudProvider = "google-drive";

export interface SyncState {
  id: CloudProvider;                 // primary key ("google-drive")
  driveFolderId?: string;            // /MyRecipes
  recipesFileId?: string;            // /MyRecipes/db/recipes.json
  imagesFolderId?: string;           // /MyRecipes/images
  autoSync?: boolean;                // UI toggle
  lastSyncAt?: number;               // epoch ms
  lastError?: string | null;         // last error message
  accessToken?: string | null;       // OAuth access token (short-lived)
  accessTokenExpiresAt?: number | null; // epoch ms when token expires
  // NEW: for code flow refresh
  refreshToken?: string | null;      // OAuth refresh token (long-lived)
}

export type RemotePayloadV1 = {
  format: "myrecipes.sync.v1";
  exportedAt: string; // ISO
  data: {
    recipes: import("@/types/recipe").Recipe[];
  };
};