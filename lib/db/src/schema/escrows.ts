import { pgTable, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const escrowStatusEnum = [
  "pending",
  "funded",
  "released",
  "disputed",
  "cancelled",
  "completed",
] as const;

export type EscrowStatus = (typeof escrowStatusEnum)[number];

export const escrowsTable = pgTable("escrows", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  buyerEmail: text("buyer_email").notNull(),
  sellerEmail: text("seller_email").notNull(),
  amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
  currency: text("currency").notNull(),
  network: text("network").notNull(),
  walletAddress: text("wallet_address").notNull().default(""),
  status: text("status").notNull().default("pending"),
  txHash: text("tx_hash"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertEscrowSchema = createInsertSchema(escrowsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEscrow = z.infer<typeof insertEscrowSchema>;
export type Escrow = typeof escrowsTable.$inferSelect;
