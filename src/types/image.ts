export interface ImageAsset {
  id: string;                // UUID
  blobUrl?: string;          // local URL (for previews)
  driveId?: string;          // for Google Drive sync
  fileName?: string;
  updatedAt: number;
  blob?: Blob;
  mime?: string;
  width?: number;
  height?: number;
  /** If set, this image is logically deleted (tombstoned) and should not be uploaded. */
  deletedAt?: number;
}
