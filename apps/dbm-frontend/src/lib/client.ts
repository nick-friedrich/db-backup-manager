import { treaty } from "@elysiajs/eden";
import type { App as BackendApp } from "@apps/dbm-backend";

export const client = treaty<BackendApp>(import.meta.env.VITE_BACKEND_URL || "http://localhost:3000", {
  fetch: {
    credentials: 'include'
  }
});