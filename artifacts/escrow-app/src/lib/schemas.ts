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
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  buyerEmail: z.string().email("Invalid buyer email"),
  sellerEmail: z.string().email("Invalid seller email"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().min(1, "Currency is required"),
  network: z.string().min(1, "Network is required"),
})
