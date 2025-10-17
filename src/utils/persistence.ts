// src/utils/persistence.ts
export async function ensurePersistentStorage(): Promise<boolean | undefined> {
  // Some browsers (iOS Safari) lack StorageManager APIs: bail gracefully
  const storage: any = (navigator as any).storage;
  if (!storage?.persist) return undefined;

  try {
    const already = await storage.persisted?.();
    if (already) return true;
    // Request persistence (user agent decides; may auto-grant for PWAs)
    return await storage.persist();
  } catch {
    return undefined;
  }
}

export async function logStorageEstimate() {
  const storage: any = (navigator as any).storage;
  if (!storage?.estimate) return;
  try {
    const { usage, quota } = await storage.estimate();
    // Helpful when debugging offline capacity; safe to keep or remove
    // eslint-disable-next-line no-console
    console.info("[storage]", {
      usage,
      quota,
      usageMB: usage ? (usage / (1024 * 1024)).toFixed(2) : undefined,
      quotaMB: quota ? (quota / (1024 * 1024)).toFixed(2) : undefined,
    });
  } catch {
    // ignore
  }
}