/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IDENTITY_ISSUER?: string;
  readonly VITE_ADMISSIONS_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
