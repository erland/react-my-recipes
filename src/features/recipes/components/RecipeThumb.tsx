import React from "react";
import { Avatar } from "@mui/material";
import { useImageUrl } from "@/hooks/useImageUrl";

export type RecipeThumbProps = {
  title: string;
  imageId?: string | null;
  size?: number;
};

export default function RecipeThumb({ title, imageId, size = 40 }: RecipeThumbProps) {
  const url = useImageUrl(imageId || undefined);
  const initials = React.useMemo(() => {
    const t = (title || "?").trim();
    const parts = t.split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join("");
  }, [title]);

  return (
    <Avatar src={url || undefined} sx={{ width: size, height: size }}>
      {!url && initials}
    </Avatar>
  );
}