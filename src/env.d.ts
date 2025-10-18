// Ensures TS knows about Vite env vars. Safe alongside vite/client.
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID: string;
}
interface ImportMeta { env: ImportMetaEnv }
