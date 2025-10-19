import { useEffect, useState } from "react";
import { db } from "@/db/schema";

export interface StorageStats {
  usedBytes?: number;
  quotaBytes?: number;
  recipeCount: number;
  imageCount: number;
  imageBytes: number; // sum of image blobs
}

export function useStorageStats(): StorageStats {
  const [stats, setStats] = useState<StorageStats>({
    recipeCount: 0,
    imageCount: 0,
    imageBytes: 0,
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const [recipeCount, images] = await Promise.all([
        db.recipes.count(),
        db.images.toArray(),
      ]);
      const imageBytes = images.reduce((sum, i) => sum + (i.blob instanceof Blob ? i.blob.size : 0), 0);

      let usedBytes: number | undefined;
      let quotaBytes: number | undefined;
      if ("storage" in navigator && (navigator as any).storage?.estimate) {
        try {
          const { usage, quota } = await (navigator as any).storage.estimate();
          usedBytes = usage;
          quotaBytes = quota;
        } catch {}
      }

      if (isMounted) {
        setStats({ recipeCount, imageCount: images.length, imageBytes, usedBytes, quotaBytes });
      }
    })();
    return () => { isMounted = false; };
  }, []);

  return stats;
}

export function fmtBytes(b?: number) {
  if (b == null) return "–";
  const mb = b / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}