/**
 * Tiny JSON‑LD importer (MVP)
 * - Fetches a URL and extracts the first <script type="application/ld+json"> containing @type: "Recipe".
 * - Maps a minimal subset into your Recipe shape.
 * NOTE: Many sites block cross‑origin fetches; handle CORS errors gracefully and instruct the user.
 */
import type { Recipe } from "@/types/recipe";
import { v4 as uuidv4 } from "uuid";

export async function importRecipeFromUrl(url: string): Promise<Recipe> {
  let html: string;
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e: any) {
    throw new Error("Kunde inte hämta sidan (CORS?). Prova att klistra in text istället.");
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const s of scripts) {
    try {
      const json = JSON.parse(s.textContent || "{}");
      const data = Array.isArray(json) ? json : [json];
      for (const node of data) {
        if (node["@type"] === "Recipe" || (Array.isArray(node["@type"]) && node["@type"].includes("Recipe"))) {
          const r: Recipe = {
            id: uuidv4(),
            title: node.name || "(Namnlöst recept)",
            description: node.description,
            totalTimeMin: parseIsoDurationToMinutes(node.totalTime) ?? undefined,
            ingredients: (node.recipeIngredient || []).map((line: string) => ({ id: uuidv4(), name: line })),
            steps: normalizeSteps(node.recipeInstructions),
            sourceUrl: url,
            sourceName: node.author?.name || undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return r;
        }
      }
    } catch {
      // ignore malformed ld+json blocks
    }
  }
  throw new Error("Hittade ingen JSON‑LD av typen Recipe på sidan.");
}

function parseIsoDurationToMinutes(d?: string): number | null {
  if (!d || typeof d !== "string" || !d.startsWith("P")) return null;
  // Very small ISO8601 duration parser (supports PT#H#M only)
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = m[2] ? parseInt(m[2], 10) : 0;
  return h * 60 + min;
}

function normalizeSteps(instr: any): { id: string; order: number; text: string }[] | undefined {
  if (!instr) return undefined;
  const steps: string[] = [];
  if (Array.isArray(instr)) {
    for (const item of instr) {
      if (typeof item === "string") steps.push(item);
      else if (typeof item?.text === "string") steps.push(item.text);
    }
  } else if (typeof instr?.text === "string") {
    steps.push(instr.text);
  }
  return steps.map((text, i) => ({ id: uuidv4(), order: i + 1, text }));
}
