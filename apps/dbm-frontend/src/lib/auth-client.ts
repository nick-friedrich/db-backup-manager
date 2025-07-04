import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:3000",
  plugins: [
    adminClient()
  ]
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient; 