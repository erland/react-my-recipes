/*
 * Google Drive client (PKCE-style via GIS Code model).
 * - Uses Google Identity Services "code" flow and exchanges code for tokens on the client.
 * - IMPORTANT: Google treats Web Application OAuth clients as confidential and expects a client_secret
 *   when you exchange the auth code (even with PKCE). This implementation **passes the secret**,
 *   because that's what you asked for — but be aware this exposes the secret in the browser.
 * - Scope: drive.file (only files this app creates)
 * - Layout:
 *     /MyRecipes/db/recipes.json
 *     /MyRecipes/images/   (each image = one Drive file)
 */

import type { SyncState } from "@/types/sync";
import { db } from "@/db/schema";
import Dexie from "dexie";

/** Google API endpoints */
const GDRIVE_API = "https://www.googleapis.com/drive/v3";
const GDRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const IMAGES_DIR = "images";

/** App layout on Drive */
const APP_ROOT = "MyRecipes";

/** Vite env */
const CLIENT_ID = ((import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_ID ?? "") as string;
const CLIENT_SECRET = ((import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_SECRET ?? "") as string;
/** Minimal scope to avoid verification friction */
const SCOPES = "https://www.googleapis.com/auth/drive.file";

/** Local cache to avoid spamming IndexedDB */
let tokenCache: { token: string; expiresAt: number } | null = null;
/** In-flight token promise gate */
let tokenPromise: Promise<string> | null = null;

/* ---------------- Utilities ---------------- */

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

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iP(hone|ad|od)/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}
async function withSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  // iOS/Safari can hang Web Locks; just run directly.
  if (isIOS()) return fn();
  try {
    const locks = (navigator as any)?.locks;
    if (locks?.request) {
      let resolved = false;
      const p = locks.request("drive-sync", async () => {
        resolved = true;
        return await fn();
      });
      // Failsafe: if a lock never resolves, fallback.
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => !resolved && rej(new Error("Web Locks timed out")), 4000)
      );
      return await Promise.race([p, timeout]).catch((e) => {
        console.warn("[drive] locks.request failed/timeout, running without lock:", e);
        return fn();
      });
    }
  } catch (e) {
    console.warn("[drive] locks.request threw, running without lock:", e);
  }
  return fn();
}

// NOTE: With the script now preloaded in index.html, this is a no-op guard.
async function ensureGisLoaded(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return;
  console.warn("[drive] GIS not yet available (script still loading)");
  // Fall back to waiting (non-interactive flows can afford this).
  await new Promise<void>((resolve) => {
    const check = () => {
      if ((window as any).google?.accounts?.oauth2) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
}


function nowPlus(sec: number) {
  return Date.now() + sec * 1000;
}

function isTokenValid(t?: { token: string; expiresAt: number } | null) {
  return !!t && t.expiresAt - 10_000 > Date.now();
}

/* ---------------- OAuth: Code model + token storage ---------------- */

type TokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: "Bearer";
  scope?: string;
  refresh_token?: string;
};

async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const redirectUri = window.location.origin; // GIS code model: popup => use origin
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Refresh failed: ${res.status} ${txt}`);
  }
  const json = (await res.json()) as TokenResponse;
  // NOTE: Refresh responses often omit a new refresh_token.
  json.refresh_token = json.refresh_token ?? refreshToken;
  return json;
}

async function authorizeAndStoreTokens(): Promise<string> {
  await ensureGisLoaded();
  // @ts-ignore
  const google = (window as any).google;
  if (!CLIENT_ID) throw new Error("VITE_GOOGLE_OAUTH_CLIENT_ID is not set.");
  if (!CLIENT_SECRET) throw new Error("VITE_GOOGLE_OAUTH_CLIENT_SECRET is not set.");

  return await new Promise<string>((resolve, reject) => {
    console.debug("[drive] initCodeClient (non-interactive path)");
    const client = google.accounts.oauth2.initCodeClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      ux_mode: "popup",
      callback: async (resp: any) => {
        try {
          if (resp?.error) {
            console.error("[drive] code flow error:", resp.error);
            return reject(new Error(resp.error));
          }
         if (!resp?.code) return reject(new Error("No authorization code returned"));
         console.debug("[drive] received auth code — exchanging for tokens…");
          const tokens = await exchangeCodeForTokens(resp.code);
          const expiresAt = nowPlus(tokens.expires_in);
          tokenCache = { token: tokens.access_token, expiresAt };
          const prev = await db.syncState.get("google-drive");
          await db.syncState.put(
            {
              ...(prev ?? { id: "google-drive" as const }),
              id: "google-drive" as const,
              accessToken: tokens.access_token,
              accessTokenExpiresAt: expiresAt,
              refreshToken: tokens.refresh_token ?? prev?.refreshToken ?? null,
              lastError: null,
            } as SyncState,
            "google-drive" as const
          );
          resolve(tokens.access_token);
        } catch (e) {
          reject(e);
        }
      },
    });
    try {
      client.requestCode();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Interactive connect explicitly triggered by the "KOPPLA KONTO" button.
 * IMPORTANT: This function performs NO await before requestCode() so iOS treats it as a user gesture.
 */
export function connectGoogleDriveInteractive(): Promise<string> {
  console.log("[drive] KOPPLA KONTO clicked — starting interactive auth");
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    console.warn("[drive] GIS not ready at click time — did index.html include the script?");
    return Promise.reject(new Error("Google Identity Services is not loaded yet."));
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("[drive] Missing CLIENT_ID/CLIENT_SECRET env");
    return Promise.reject(new Error("Missing Google OAuth env (client id/secret)."));
  }

  return new Promise<string>((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initCodeClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        ux_mode: "popup",
        callback: async (resp: any) => {
          try {
            if (resp?.error) {
              console.error("[drive] ❌ auth error:", resp.error);
              return reject(new Error(resp.error));
            }
            if (!resp?.code) {
              console.error("[drive] ❌ no code in callback");
              return reject(new Error("No authorization code returned"));
            }
            console.debug("[drive] ✅ got code — exchanging…");
            const tokens = await exchangeCodeForTokens(resp.code);
            const expiresAt = nowPlus(tokens.expires_in);
            tokenCache = { token: tokens.access_token, expiresAt };
            const prev = await db.syncState.get("google-drive");
            await db.syncState.put(
              {
                ...(prev ?? { id: "google-drive" as const }),
                id: "google-drive" as const,
                accessToken: tokens.access_token,
                accessTokenExpiresAt: expiresAt,
                refreshToken: tokens.refresh_token ?? prev?.refreshToken ?? null,
                lastError: null,
              } as SyncState,
              "google-drive" as const
            );
            console.log("[drive] ✅ tokens stored");
            resolve(tokens.access_token);
          } catch (err) {
            console.error("[drive] ❌ token exchange failed:", err);
            reject(err as any);
          }
        },
      });
      // CRITICAL: call requestCode() in the same call stack as the click (no await before this)
      client.requestCode();
    } catch (e) {
      console.error("[drive] ❌ requestCode threw:", e);
      reject(e as any);
    }
  });
}

export async function getValidToken(): Promise<string> {
  if (tokenCache && isTokenValid(tokenCache)) return tokenCache.token;
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    const st = await db.syncState.get("google-drive");

    // 1) Cached and valid in DB
    if (st?.accessToken && st?.accessTokenExpiresAt && st.accessTokenExpiresAt - 10_000 > Date.now()) {
      tokenCache = { token: st.accessToken, expiresAt: st.accessTokenExpiresAt };
      return st.accessToken;
    }

    // 2) Try refresh if we have a refresh token
    if (st?.refreshToken) {
      try {
        const refreshed = await refreshAccessToken(st.refreshToken);
        const expiresAt = nowPlus(refreshed.expires_in);
        tokenCache = { token: refreshed.access_token, expiresAt };
        await db.syncState.put(
          {
            ...(st ?? { id: "google-drive" as const }),
            id: "google-drive" as const,
            accessToken: refreshed.access_token,
            accessTokenExpiresAt: expiresAt,
            refreshToken: refreshed.refresh_token ?? st.refreshToken,
            lastError: null,
          } as SyncState,
          "google-drive" as const
        );
        return refreshed.access_token;
      } catch (e) {
        console.warn("[drive] refresh failed, falling back to full auth", e);
      }
    }

    // 3) Fall back to interactive code flow
    console.debug("[drive] no valid token — falling back to interactive flow");
    return await authorizeAndStoreTokens();
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

/* ---------------- Auth-aware fetch helpers ---------------- */

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidToken();
  let res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    // Token might have been revoked, try once after clearing
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
  console.debug("[drive][net] → GET/JSON", path);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  const res = await withBackoff(() =>
    authFetch(`${GDRIVE_API}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    })
  ).finally(() => clearTimeout(t));
  if (!res.ok) {
    const text = await res.text();
    console.error("[drive][net] ← ERR", res.status, text);
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }
  const json = await res.json();
  console.debug("[drive][net] ← OK", path);
  return json;
}

async function gdriveUploadMultipart(meta: Record<string, any>, body: Blob | string): Promise<any> {
  const boundary = "====myrecipes-boundary===";
  const metaJson = JSON.stringify(meta);
  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaJson}\r\n`;
  const mediaType =
    typeof body !== "string" && body instanceof Blob && body.type
      ? body.type
      : "application/octet-stream";
  const mediaHeader = `--${boundary}\r\nContent-Type: ${mediaType}\r\n\r\n`;

  const end = `\r\n--${boundary}--`;

  const fullBody =
    body instanceof Blob
      ? new Blob([metaPart, mediaHeader, body, end])
      : `${metaPart}${mediaHeader}${body}${end}`;

  console.debug("[drive][net] → CREATE multipart", meta?.name);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30_000);
  const res = await withBackoff(() =>
    authFetch(`${GDRIVE_UPLOAD_API}/files?uploadType=multipart`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: fullBody,
    })
  ).finally(() => clearTimeout(t));

  if (!res.ok) {
    const text = await res.text();
    console.error("[drive] upload failed", res.status, text);
    throw new Error(`Drive upload error ${res.status}: ${text}`);
  }

  const json = await res.json();
  console.debug("[drive][net] ← CREATED", json?.id);
  return json;
}

async function findByNameInParent(name: string, parentId?: string): Promise<string | undefined> {
  const q: string[] = [
    `name = '${name.replaceAll("'", "\\'")}'`,
    "trashed = false",
    parentId ? `'${parentId}' in parents` : undefined,
  ].filter(Boolean) as string[];

  const data = await gdriveFetch(
    `/files?q=${encodeURIComponent(q.join(" and "))}&fields=files(id,name,mimeType,parents)`
  );
  return data?.files?.[0]?.id as string | undefined;
}

async function ensurePath(path: string[]): Promise<string> {
  console.debug("[drive] ensurePath start", path);
  let parent = "root";
  for (const part of path) {
    const existing = await findByNameInParent(part, parent);
    if (existing) {
      console.debug("[drive] ensurePath found", part, "→", existing);
      parent = existing;
      continue;
    }
    console.debug("[drive] ensurePath creating", part, "under", parent);
    const created = await gdriveFetch(`/files`, {
      method: "POST",
      body: JSON.stringify({
        name: part,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parent],
      }),
    });
    console.debug("[drive] ensurePath created", part, "→", created?.id);
    parent = created.id as string;
  }
  console.debug("[drive] ensurePath done →", parent);
  return parent;
}

/* ---------------- Public API ---------------- */

export async function ensureDriveLayout(): Promise<SyncState> {
  console.debug("[drive] ensureDriveLayout() start");
  return withSyncLock(async () => {
    const dbFolderId = await ensurePath([APP_ROOT, "db"]);
    const imagesFolderId = await ensurePath([APP_ROOT, IMAGES_DIR]);
    
    // Ensure recipes.json exists
    const existingFileId = await findByNameInParent("recipes.json", dbFolderId);
    let recipesFileId = existingFileId;
    if (!recipesFileId) {
      console.debug("[drive] recipes.json missing — creating");
      const payload = {
        format: "myrecipes.sync.v1",
        exportedAt: new Date().toISOString(),
        data: { recipes: [] },
      };
      const created = await gdriveUploadMultipart(
        { name: "recipes.json", parents: [dbFolderId], mimeType: "application/json" },
        JSON.stringify(payload)
      );
      recipesFileId = created.id as string;
      console.debug("[drive] recipes.json created", recipesFileId);
    } else {
      console.debug("[drive] recipes.json exists", recipesFileId);
    }

    const latest = (await db.syncState.get("google-drive")) ??
      ({ id: "google-drive" as const } as SyncState);
    const next: SyncState = {
      ...latest,
      id: "google-drive",
      driveFolderId: dbFolderId, // keep db folder here for backwards compatibility
      imagesFolderId,
      recipesFileId,
      lastError: null,
    };
    await db.syncState.put(next, "google-drive");
    console.debug("[drive] ensureDriveLayout() done");
    return next;
  });
}

export async function downloadRecipesJson(fileId: string): Promise<any> {
  const res = await withBackoff(() =>
    authFetch(`${GDRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, {
      method: "GET",
    })
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function uploadRecipesJson(fileId: string, json: any): Promise<void> {
  // Use the media upload path for content-only updates (no metadata).
  // This avoids sending non-writable fields in the body (e.g. id),
  // which causes 403 fieldNotWritable.
  const res = await withBackoff(() =>
    authFetch(
      `${GDRIVE_UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(json),
      }
    )
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload error ${res.status}: ${text}`);
  }
}

/** Move a Drive file to Trash (non-destructive; can be restored). */
export async function trashDriveImage(fileId: string): Promise<void> {
  const res = await withBackoff(() =>
    authFetch(`${GDRIVE_API}/files/${encodeURIComponent(fileId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ trashed: true }),
    })
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trash image error ${res.status}: ${text}`);
  }
}

  /* ---------------- Images (per-file) ---------------- */

export type DriveImageMeta = {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string; // ISO
};

/** List all image files under /MyRecipes/images (single page is fine; UUID names are sparse). */
export async function listDriveImages(folderId: string): Promise<DriveImageMeta[]> {
  const q = [
    "trashed = false",
    `'${folderId}' in parents`,
  ].join(" and ");
  const data = await gdriveFetch(
    `/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,parents)&pageSize=1000`
  );
  return (data?.files ?? []) as DriveImageMeta[];
}

export async function downloadDriveImage(fileId: string): Promise<Blob> {
  const res = await withBackoff(() =>
    authFetch(`${GDRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, { method: "GET" })
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download image error ${res.status}: ${text}`);
  }
  return res.blob();
}

export async function createDriveImage(folderId: string, name: string, blob: Blob): Promise<string> {
  const meta = {
    name,
    parents: [folderId],
    mimeType: blob.type || "application/octet-stream",
  };

  const created = await gdriveUploadMultipart(meta, blob);
  if (!created?.id) {
    console.warn("[drive][image] createDriveImage → no id returned", created);
    throw new Error("Image upload failed — no file ID");
  }
  console.debug("[drive][image] uploaded", name, "→", created.id);
  return created.id as string;
}

export async function updateDriveImage(fileId: string, blob: Blob): Promise<void> {
  const res = await withBackoff(() =>
    authFetch(
      `${GDRIVE_UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media`,
      { method: "PATCH", headers: { "Content-Type": blob.type || "application/octet-stream" }, body: blob }
    )
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update image error ${res.status}: ${text}`);
  }
}

export async function signOutDrive(): Promise<void> {
  try {
    const st = await db.syncState.get("google-drive");
    const accessToken = st?.accessToken ?? null;
    const refreshToken = (st as any)?.refreshToken ?? null;

    // Best-effort revoke
    if (accessToken) {
      try {
        await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(accessToken)}`, { method: "POST" });
      } catch {}
    }
    if (refreshToken) {
      try {
        await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(refreshToken)}`, { method: "POST" });
      } catch {}
    }
  } finally {
    const prev = await db.syncState.get("google-drive");
    await db.syncState.put(
      {
        ...(prev ?? { id: "google-drive" as const }),
        id: "google-drive" as const,
        accessToken: null,
        accessTokenExpiresAt: null,
        // @ts-ignore
        refreshToken: null,
      },
      "google-drive" as const
    );
    tokenCache = null;
  }
}