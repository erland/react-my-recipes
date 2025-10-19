import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/schema";

export function useImageUrl(imageId?: string) {
  const img = useLiveQuery(() => (imageId ? db.images.get(imageId) : undefined), [imageId]);
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!img) {
      setUrl(undefined);
      return;
    }
    if (img.blob instanceof Blob) {
      const u = URL.createObjectURL(img.blob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    if (img.blobUrl) {
      setUrl(img.blobUrl); // legacy / preview-only
      return;
    }
    setUrl(undefined);
  }, [img?.blob, img?.blobUrl]);

  return url;
}