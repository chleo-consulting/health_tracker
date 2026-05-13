import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/index";
import * as schema from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      sendPasswordResetEmail(user.email, url).catch((err) =>
        console.error("[reset-password] Resend error:", err)
      );
    },
    resetPasswordTokenExpiresIn: 3600,
  },
  session: {
    expiresIn: 60 * 60 * 24, // 24 heures
    updateAge: 60 * 60, // Renouvellement si activité dans l'heure
  },
});
