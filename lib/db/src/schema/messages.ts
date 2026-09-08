import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { escrowsTable } from "./escrows";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrow_id")
    .notNull()
    .references(() => escrowsTable.id, { onDelete: "cascade" }),
  senderEmail: text("sender_email").notNull(),
  /** 'buyer' | 'seller' | 'system' */
  senderRole: text("sender_role").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
