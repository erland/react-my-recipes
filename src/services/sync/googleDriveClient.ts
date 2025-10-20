/*
 * Google Drive client (MVP, no backend):
 * - Uses Google Identity Services "token" flow (no refresh token). When expired, we re-prompt.
 * - Scope: drive.file (only files the app creates)
 * - Layout: /RecipeBox/db/recipes.json
 */

import type { SyncState } from "@/types/sync";
import { db } from "@/db/schema";
import Dexie from "dexie";

const GDRIVE_API = "https://www.googleapis.com/drive/v3";
const GDRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const APP_ROOT = "RecipeBox";

// Vite env
const CLIENT_ID = ((import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_ID ?? "") as string;
// Minimal scope to avoid verification friction
const SCOPES = "https://www.googleapis.com/auth/drive.file";

// ---------------- Utilities (optional hardening) ----------------
async function withBackoff<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let delay = 300;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message || "");
      const transient =
        /(?:\b429\b|rate|quota|timeout|temporar|EAI_AGAIN|network|fetch failed|ECONN)/i.test(msg);
      if (!transient || --tries <= 0) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

async function withSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (typeof navigator !== "undefined" && navigator?.locks?.request) {
      return await navigator.locks.request("drive-sync", fn);
    }
  } catch {
    // ignore and fall through
  }
  return fn();
}

// ---------------- Token management ----------------
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
  return !!t && t.expiresAt - 10_000 > Date.now();
}

export async function getValidToken(): Promise<string> {
  // 1) In-memory
  if (isTokenValid(tokenCache)) return tokenCache!.token;

  // 2) Reuse in-flight
  if (tokenPromise) return tokenPromise;

  // 3) Dexie cache
  const cached = await db.syncState.get("google-drive");
  if (
    cached?.accessToken &&
    cached?.accessTokenExpiresAt &&
    cached.accessTokenExpiresAt - 10_000 > Date.now()
  ) {
    tokenCache = { token: cached.accessToken, expiresAt: cached.accessTokenExpiresAt };
    return cached.accessToken;
  }

  if (!CLIENT_ID) {
    throw new Error("VITE_GOOGLE_OAUTH_CLIENT_ID is not set.");
  }

  // 4) Acquire new
  tokenPromise = (async () => {
    await ensureGisLoaded();
    const google = (window as any).google;

    return await new Promise<string>((resolve, reject) => {
      let retriedInteractive = false;

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp?.error) {
            // If silent attempt failed, retry once with consent prompt.
            if (!retriedInteractive) {
              retriedInteractive = true;
              try {
                tokenClient.requestAccessToken({ prompt: "consent" });
                return;
              } catch {
                // fallthrough to reject
              }
            }
            tokenPromise = null;
            reject(new Error(resp.error));
            return;
          }

          const token = resp.access_token as string;
          const expiresIn = (resp.expires_in as number) ?? 3600;
          const expiresAt = Date.now() + expiresIn * 1000;

          tokenCache = { token, expiresAt };

          // Persist token in a Dexie-safe context and with an explicit key.
          Dexie.waitFor(
            (async () => {
              const prev = await db.syncState.get("google-drive");
              const next: SyncState = {
                ...(prev ?? { id: "google-drive" as const }),
                id: "google-drive" as const,
                accessToken: token,
                accessTokenExpiresAt: expiresAt,
                lastError: null,
              };
              await db.syncState.put(next, "google-drive" as const);
              // eslint-disable-next-line no-console
              console.log(
                "[drive] token persisted to Dexie (expires at)",
                new Date(expiresAt).toISOString()
              );
            })()
          ).catch((err) => console.error("[drive] Dexie waitFor failed:", err));

          tokenPromise = null;
          resolve(token);
        },
      });

      // Try silent first; consent only if needed
      tokenClient.requestAccessToken({ prompt: cached?.accessToken ? "" : "consent" });
    });
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

// --------------- Auth-aware fetch helpers ---------------
async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidToken();
  let res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    // token invalid/revoked: clear caches and retry once
    tokenCache = null;
    try {
      const prev = await db.syncState.get("google-drive");
      await db.syncState.put(
        {
          ...(prev ?? { id: "google-drive" as const }),
          id: "google-drive" as const,
          accessToken: null,
          accessTokenExpiresAt: null,
        } as any,
        "google-drive" as const
      );
    } catch {}
    const token2 = await getValidToken();
    res = await fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token2}` },
    });
  }

  return res;
}

async function gdriveFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await withBackoff(() => authFetch(`${GDRIVE_API}${path}`, init));
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API ${res.status}: ${text}`);
  }
  return res.json();
}

async function gdriveUploadMultipart(meta: Record<string, any>, body: Blob | string): Promise<any> {
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

  const res = await withBackoff(() =>
    authFetch(`${GDRIVE_UPLOAD_API}/files?uploadType=multipart`, {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    })
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive upload ${res.status}: ${text}`);
  }
  return res.json();
}

async function gdrivePatchMultipart(fileId: string, json: any): Promise<Response> {
  const boundary = `rb_${Math.random().toString(36).slice(2)}`;
  const meta = { name: "recipes.json" };
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

  return withBackoff(() =>
    authFetch(`${GDRIVE_UPLOAD_API}/files/${fileId}?uploadType=multipart`, {
      method: "PATCH",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    })
  );
}

// ---------------- Folder & File helpers ----------------
async function findByNameInParent(name: string, parentId?: string): Promise<string | undefined> {
  const safeName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const parentExpr = parentId ? `'${parentId}' in parents` : `'root' in parents`;
  const q = `name = '${safeName}' and ${parentExpr} and trashed = false`;
  const res = await gdriveFetch(
    `/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents,mimeType)`
  );
  return res.files?.[0]?.id;
}

async function ensureFolder(name: string, parentId?: string): Promise<string> {
  const existing = await findByNameInParent(name, parentId);
  if (existing) return existing;

  const res = await withBackoff(() =>
    authFetch(`${GDRIVE_API}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : undefined,
      }),
    })
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed creating folder '${name}': ${res.status} ${text}`);
  }
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

// ---------------- Public API ----------------
export async function ensureDriveLayout(): Promise<SyncState> {
  return withSyncLock(async () => {
    // NOTE: do NOT capture state once and write it back later (race with token write).
    // Always re-read latest state right before writing to avoid clobbering accessToken.
    const rootId = await ensurePath([APP_ROOT, "db"]);

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

    // ⬇️ Re-read latest row and merge to avoid wiping tokens (fixes the race you’re seeing)
    const latest =
      (await db.syncState.get("google-drive")) ??
      ({ id: "google-drive" as const } as SyncState);
    const next: SyncState = {
      ...latest,
      id: "google-drive" as const,
      driveFolderId: rootId,
      recipesFileId,
    };
    await db.syncState.put(next, "google-drive" as const);
    return next;
  });
}

export async function downloadRecipesJson(fileId: string): Promise<any> {
  const res = await withBackoff(() =>
    authFetch(`${GDRIVE_API}/files/${fileId}?alt=media`)
  );
  if (res.status === 403 || res.status === 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Download failed ${res.status}: ${text}`);
  }
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return await res.json();
}

export async function uploadRecipesJson(fileId: string, json: any): Promise<void> {
  const res = await gdrivePatchMultipart(fileId, json);
  if (res.status === 403 || res.status === 404) {
    const state = await db.syncState.get("google-drive");
    const folderId = state?.driveFolderId;
    if (!folderId) throw new Error(`Upload failed ${res.status} and driveFolderId is missing`);

    const created = await gdriveUploadMultipart(
      { name: "recipes.json", parents: [folderId], mimeType: "application/json" },
      JSON.stringify(json)
    );
    const newFileId = created.id as string;

    const prev = await db.syncState.get("google-drive");
    await db.syncState.put(
      {
        ...(prev ?? { id: "google-drive" as const }),
        id: "google-drive" as const,
        recipesFileId: newFileId,
      },
      "google-drive" as const
    );
    return;
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
  const prev = await db.syncState.get("google-drive");
  await db.syncState.put(
    {
      ...(prev ?? { id: "google-drive" as const }),
      id: "google-drive" as const,
      accessToken: null,
      accessTokenExpiresAt: null,
    },
    "google-drive" as const
  );
}