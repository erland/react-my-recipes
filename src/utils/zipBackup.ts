import JSZip from "jszip";
import { db } from "@/db/schema";
import type { ImageAsset, Recipe } from "@/types/recipe";

/** File name helpers */
function tsName(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function extFromMime(m?: string) {
  if (!m) return "bin";
  if (m.includes("webp")) return "webp";
  if (m.includes("jpeg")) return "jpg";
  if (m.includes("png")) return "png";
  return m.split("/").pop() || "bin";
}
async function blobFromAsset(a: ImageAsset): Promise<Blob | undefined> {
  if (a.blob instanceof Blob) return a.blob;
  if (a.blobUrl) {
    try {
      const res = await fetch(a.blobUrl);
      if (res.ok) return await res.blob();
    } catch {}
  }
  return undefined;
}
function downloadBlob(b: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(b);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Export everything into a single ZIP and trigger a download */
export async function exportZip(): Promise<void> {
  const zip = new JSZip();
  const [recipes, images] = await Promise.all([db.recipes.toArray(), db.images.toArray()]);

  // recipes.json
  zip.file(
    "recipes.json",
    JSON.stringify(
      {
        version: 1,
        exportedAt: Date.now(),
        recipes,
        // keep image metadata (without blob) in case it's useful later
        imagesMeta: images.map(({ id, fileName, updatedAt, mime, width, height, driveId }) => ({
          id,
          fileName,
          updatedAt,
          mime,
          width,
          height,
          driveId,
        })),
      },
      null,
      2
    )
  );

  // images/
  const imgFolder = zip.folder("images");
  if (imgFolder) {
    for (const img of images) {
      const blob = await blobFromAsset(img);
      if (!blob) continue;
      const ext = img.fileName?.split(".").pop() || extFromMime(img.mime);
      const name = `${img.id}.${ext}`;
      imgFolder.file(name, blob);
    }
  }

  const out = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  downloadBlob(out, `recipes-backup-${tsName()}.zip`);
}

/** Import a ZIP created by exportZip() */
export async function importZip(file: File): Promise<void> {
  const zip = await JSZip.loadAsync(file);

  // 1) Read recipes.json (if present)
  const recipesEntry = zip.file("recipes.json");
  let incoming: { recipes?: Recipe[] } | undefined;
  if (recipesEntry) {
    const json = await recipesEntry.async("string");
    try {
      incoming = JSON.parse(json);
    } catch {
      incoming = undefined;
    }
  }

  // 2) Upsert recipes with LWW on updatedAt
  if (incoming?.recipes?.length) {
    for (const r of incoming.recipes) {
      const existing = await db.recipes.get(r.id);
      if (!existing || (r.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
        await db.recipes.put(r);
      }
    }
  }

  // 3) Import images from /images
  const imgFiles = Object.values(zip.files).filter((f) => f.name.startsWith("images/") && !f.dir);
  for (const f of imgFiles) {
    // filename like images/<id>.<ext>
    const base = f.name.split("/").pop()!;
    const id = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
    const blob = await f.async("blob");

    // Try to infer mime
    const ext = base.split(".").pop()?.toLowerCase();
    const mime =
      ext === "webp" ? "image/webp" :
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "png" ? "image/png" : undefined;

    // Best-effort dimensions
    let width: number | undefined;
    let height: number | undefined;
    try {
      const bmp = await createImageBitmap(blob);
      width = bmp.width;
      height = bmp.height;
      // close ImageBitmap (no-op in most browsers)
      // @ts-ignore
      bmp.close?.();
    } catch {}

    const existing = await db.images.get(id);
    const asset: ImageAsset = {
      id,
      fileName: base,
      updatedAt: Date.now(),
      blob,
      mime,
      width,
      height,
      driveId: existing?.driveId, // preserve if any
    };

    // Always overwrite local image; it’s content-addressed by id in our exports
    await db.images.put(asset);
  }
}