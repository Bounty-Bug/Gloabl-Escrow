import { z } from "zod"

export const EscrowSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  buyerEmail: z.string(),
  sellerEmail: z.string(),
  amount: z.string(),
  currency: z.string(),
  network: z.string(),
  walletAddress: z.string(),
  status: z.enum(["pending", "funded", "released", "disputed", "cancelled", "completed"]),
  txHash: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateEscrowSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  buyerEmail: z.string().email("Invalid buyer email"),
  sellerEmail: z.string().email("Invalid seller email"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d+)?$/, "Enter a valid number (e.g. 0.05 or 100)")
    .refine((v) => parseFloat(v) > 0, "Amount must be greater than zero"),
  currency: z.string().min(1, "Select a currency"),
  network: z.string().min(1, "Select a network"),
}).refine(
  (d) => d.buyerEmail.toLowerCase() !== d.sellerEmail.toLowerCase(),
  { message: "Buyer and seller must be different people", path: ["sellerEmail"] }
)
