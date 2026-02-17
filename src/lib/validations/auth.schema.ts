import { z } from "zod";

export const registerSchema = z.object({
  email: z.email("Format email invalide"),
  password: z
    .string()
    .min(8, "Minimum 8 caractères")
    .max(128, "Maximum 128 caractères")
    .regex(/[A-Z]/, "Au moins une lettre majuscule")
    .regex(/[a-z]/, "Au moins une lettre minuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
});

export const loginSchema = z.object({
  email: z.email("Format email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
