// Ensures TS knows about Vite env vars. Safe alongside vite/client.
interface ImportMetaEnv {
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID: string;
}
interface ImportMeta { env: ImportMetaEnv }
