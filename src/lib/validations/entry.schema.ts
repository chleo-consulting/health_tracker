import { z } from "zod";

export const entrySchema = z.object({
  entry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD requis")
    .refine(
      (d) => d <= new Date().toISOString().split("T")[0],
      "La date ne peut pas être dans le futur"
    ),
  weight_kg: z
    .number()
    .min(3, "Le poids minimum est 3 kg")
    .max(150, "Le poids maximum est 150 kg")
    .refine(
      (w) => Number(w.toFixed(1)) === w,
      "Précision maximale d'une décimale"
    ),
  notes: z.string().max(500, "Maximum 500 caractères").nullable().optional(),
});

export type EntryInput = z.infer<typeof entrySchema>;
