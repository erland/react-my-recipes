/*
 * Google Drive client (MVP, no backend):
 * - Uses Google Identity Services "token" flow (no refresh token). When expired, we re-prompt.
 * - Default scope: drive.file (restrict to files the app creates). Broader scopes are supported if you set SCOPES below.
 * - Creates/uses folder structure: /RecipeBox/db/recipes.json
 */

import type { SyncState } from "@/types/sync";
import { db } from "@/db/schema";

const GDRIVE_API = "https://www.googleapis.com/drive/v3";
const GDRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const APP_ROOT = "RecipeBox"; // user-visible root folder

// Configure via Vite env (define in .env.local)
const CLIENT_ID = ((import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_ID ?? "") as string;

// Choose your scope strategy:
// - Minimal, no-verification path (recommended for MVP/personal use):
//   const SCOPES = "https://www.googleapis.com/auth/drive.file";
// - Broader (if you have legacy files or run into access issues):
//   const SCOPES = "https://www.googleapis.com/auth/drive";
const SCOPES = "https://www.googleapis.com/auth/drive";

// ---------------- Token management (single-prompt, reuse, cache) -------------
let tokenCache: { token: string; expiresAt: number } | null = null;
let tokenPromise: Promise<string> | null = null;

async function ensureGisLoaded(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
}

function isTokenValid(t?: { token: string; expiresAt: number } | null) {
  if (!t) return false;
  return t.expiresAt - 10_000 > Date.now();
}

async function getValidToken(): Promise<string> {
  // 1) In-memory cache first (prevents double prompts in one run)
  if (isTokenValid(tokenCache)) return tokenCache!.token;

  // 2) If another request is in-flight, reuse it.
  if (tokenPromise) return tokenPromise;

  // 3) Try DB cache (persists across reloads)
  const state = await db.syncState.get("google-drive");
  if (state?.accessToken && state?.accessTokenExpiresAt && state.accessTokenExpiresAt - 10_000 > Date.now()) {
    tokenCache = { token: state.accessToken, expiresAt: state.accessTokenExpiresAt };
    return state.accessToken;
  }

  // 4) Acquire a fresh token (single flight)
  tokenPromise = (async () => {
    await ensureGisLoaded();
    const google = (window as any).google;

    const promptMode =
      state?.accessToken && state?.accessTokenExpiresAt && state.accessTokenExpiresAt > Date.now()
        ? "" // silent if possible
        : "consent"; // first time (or if we explicitly want to show)

    return await new Promise<string>((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        // We'll override `prompt` in requestAccessToken so we can switch modes dynamically.
        callback: async (resp: any) => {
          if (resp.error) {
            tokenPromise = null;
            return reject(new Error(resp.error));
          }
          const token = resp.access_token as string;
          const expiresIn = (resp.expires_in as number) ?? 3600;
          const expiresAt = Date.now() + expiresIn * 1000;

          tokenCache = { token, expiresAt };
          await db.syncState.put(
            {
              id: "google-drive",
              accessToken: token,
              accessTokenExpiresAt: expiresAt,
              lastError: null,
            },
            "google-drive"
          );

          tokenPromise = null;
          resolve(token);
        },
      });

      tokenClient.requestAccessToken({ prompt: promptMode });
    });
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

// -------------------- Low-level HTTP helpers ---------------------------------
async function gdriveFetch(path: string, init: RequestInit = {}): Promise<any> {
  const token = await getValidToken();
  const res = await fetch(`${GDRIVE_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API ${res.status}: ${text}`);
  }
  return res.json();
}

async function gdriveUploadMultipart(meta: Record<string, any>, body: Blob | string): Promise<any> {
  const token = await getValidToken();
  const boundary = `rb_${Math.random().toString(36).slice(2)}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;
  const metaStr = JSON.stringify(meta);
  const bodyPart = body instanceof Blob ? await body.text() : body;
  const multipartBody = [
    delimiter,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    metaStr,
    delimiter,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    bodyPart,
    closeDelim,
  ].join("");

  const res = await fetch(`${GDRIVE_UPLOAD_API}/files?uploadType=multipart`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive upload ${res.status}: ${text}`);
  }
  return res.json();
}

async function gdrivePatchMultipart(fileId: string, json: any): Promise<Response> {
  const token = await getValidToken();
  const boundary = `rb_${Math.random().toString(36).slice(2)}`;
  const meta = { name: "recipes.json" }; // ✅ include valid fields
  const metaStr = JSON.stringify(meta);
  const bodyStr = JSON.stringify(json);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;
  const multipartBody = [
    delimiter,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    metaStr,
    delimiter,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    bodyStr,
    closeDelim,
  ].join("");

  return fetch(`${GDRIVE_UPLOAD_API}/files/${fileId}?uploadType=multipart`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });
}

// ----------------------- Folder & File helpers -------------------------------
async function findByNameInParent(name: string, parentId?: string): Promise<string | undefined> {
  // Build Drive v3 search query. Top-level files live under 'root'.
  // Escape backslashes and single quotes inside the name literal.
  const safeName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const parentExpr = parentId ? `'${parentId}' in parents` : `'root' in parents`;
  const q = `name = '${safeName}' and ${parentExpr} and trashed = false`;
  const res = await gdriveFetch(`/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents,mimeType)`);
  return res.files?.[0]?.id;
}

async function ensureFolder(name: string, parentId?: string): Promise<string> {
  const existing = await findByNameInParent(name, parentId);
  if (existing) return existing;
  const token = await getValidToken();
  const res = await fetch(`${GDRIVE_API}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Failed creating folder '${name}'`);
  const json = await res.json();
  return json.id as string;
}

async function ensurePath(path: string[]): Promise<string> {
  let parent: string | undefined = undefined;
  for (const segment of path) {
    parent = await ensureFolder(segment, parent);
  }
  return parent!;
}

// ------------------- Public API (used by sync engine/UI) ---------------------
export async function ensureDriveLayout(): Promise<SyncState> {
  const state = (await db.syncState.get("google-drive")) ?? { id: "google-drive" };
  const rootId = await ensurePath([APP_ROOT, "db"]);

  // Ensure recipes.json exists
  const existingFileId = await findByNameInParent("recipes.json", rootId);
  let recipesFileId = existingFileId;
  if (!recipesFileId) {
    const payload = {
      format: "recipebox.sync.v1",
      exportedAt: new Date().toISOString(),
      data: { recipes: [] },
    };
    const created = await gdriveUploadMultipart(
      { name: "recipes.json", parents: [rootId], mimeType: "application/json" },
      JSON.stringify(payload)
    );
    recipesFileId = created.id as string;
  }

  const next: SyncState = {
    ...state,
    driveFolderId: rootId,
    recipesFileId,
  };
  await db.syncState.put(next, "google-drive");
  return next;
}

export async function downloadRecipesJson(fileId: string): Promise<any> {
  const token = await getValidToken();
  const res = await fetch(`${GDRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 403 || res.status === 404) {
    // Not accessible / Not found — bubble up, caller may self-heal.
    const text = await res.text().catch(() => "");
    throw new Error(`Download failed ${res.status}: ${text}`);
  }
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return await res.json();
}

// Upload with self-heal: if 403/404, recreate file in current folder and retry once.
export async function uploadRecipesJson(fileId: string, json: any): Promise<void> {
  const res = await gdrivePatchMultipart(fileId, json);

  if (res.status === 403 || res.status === 404) {
    // Self-heal: recreate file under the current folder id, then retry once.
    const state = await db.syncState.get("google-drive");
    const folderId = state?.driveFolderId;
    if (!folderId) throw new Error(`Upload failed ${res.status} and driveFolderId is missing`);

    // Create a fresh file owned/accessible by the current token
    const created = await gdriveUploadMultipart(
      { name: "recipes.json", parents: [folderId], mimeType: "application/json" },
      JSON.stringify(json)
    );
    const newFileId = created.id as string;

    // Persist the new file id so future syncs use it
    await db.syncState.put({ id: "google-drive", recipesFileId: newFileId }, "google-drive");
    return; // success after recreate
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed ${res.status}: ${text}`);
  }
}

export async function signOutDrive() {
  const google = (window as any).google;
  try {
    const token = (await db.syncState.get("google-drive"))?.accessToken;
    google?.accounts?.oauth2?.revoke?.(token, () => {});
  } catch {}
  await db.syncState.put(
    { id: "google-drive", accessToken: null, accessTokenExpiresAt: null },
    "google-drive"
  );
}