import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { account, jwks, session, user, verification } from "@packages/sqlite_schema/auth";
import { jwt } from "better-auth/plugins"
import { admin } from "better-auth/plugins"

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: {
			user: user,
			account: account,
			session: session,
			verification: verification,
			jwks: jwks,
		}
	}),
	plugins: [jwt(), admin()],
	trustedOrigins: ["http://localhost:5173"],
	emailAndPassword: { enabled: true },

});
