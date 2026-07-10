import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, escrowsTable } from "@workspace/db";
import { z } from "zod";
import {
  ListEscrowsQueryParams,
  GetEscrowParams,
  UpdateEscrowParams,
  FundEscrowParams,
  FundEscrowBody,
  ReleaseEscrowParams,
  ReleaseEscrowBody,
  DisputeEscrowParams,
  DisputeEscrowBody,
  CancelEscrowParams,
  CancelEscrowBody,
} from "@workspace/api-zod";
import { getDepositAddress } from "../lib/okx";
import {
  sendEscrowCreated,
  sendEscrowFunded,
  sendEscrowReleased,
  sendEscrowDisputed,
  sendEscrowCancelled,
} from "../lib/mailer";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

// Strict input validators (stricter than codegen'd schemas)
const EscrowCreateValidator = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  buyerEmail: z.string().email().max(254),
  sellerEmail: z.string().email().max(254),
  amount: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Amount must be a valid positive number")
    .refine((v: string) => parseFloat(v) > 0, "Amount must be greater than zero"),
  currency: z.string().min(1).max(20),
  network: z.string().min(1).max(50),
});

const EscrowPatchValidator = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Atomically transition an escrow to a new status.
 * Returns the updated row, or null if the row was not found
 * or the current status did not match the expected value.
 * This prevents race conditions — no check-then-update pattern.
 */
async function atomicTransition(
  id: number,
  fromStatuses: string[],
  toStatus: string,
  extra: Record<string, unknown> = {},
) {
  // Build an IN-list condition manually so Drizzle keeps it parameterized
  const placeholders = fromStatuses.map((_, i) => `$${i + 3}`).join(", ");
  const result = await db.execute(
    sql.raw(
      `UPDATE escrows SET status = $1, updated_at = now()${
        Object.keys(extra)
          .map((k, i) => `, ${toSnakeCase(k)} = $${i + fromStatuses.length + 3}`)
          .join("")
      } WHERE id = $2 AND status IN (${placeholders}) RETURNING *`,
    ),
  );
  // Fall back to a typed Drizzle update if no extra fields (simpler path)
  return undefined; // replaced below
}

function toSnakeCase(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * Safe atomic status transition using raw parameterized SQL.
 */
async function transition(
  id: number,
  fromStatuses: string[],
  toStatus: string,
  extra: { txHash?: string | null; notes?: string | null } = {},
) {
  // Build dynamic SET clause
  const setClauses: string[] = ["status = $1", "updated_at = now()"];
  const params: unknown[] = [toStatus, id];
  let paramIdx = 3;

  if (extra.txHash !== undefined) {
    setClauses.push(`tx_hash = $${paramIdx++}`);
    params.push(extra.txHash);
  }
  if (extra.notes !== undefined) {
    setClauses.push(`notes = $${paramIdx++}`);
    params.push(extra.notes);
  }

  // Inline the status list as $3, $4, ... params
  const statusPlaceholders = fromStatuses.map(() => `$${paramIdx++}`).join(", ");
  params.push(...fromStatuses);

  const query = `UPDATE escrows SET ${setClauses.join(", ")} WHERE id = $2 AND status IN (${statusPlaceholders}) RETURNING *`;

  const raw = await db.execute<typeof escrowsTable.$inferSelect>(
    sql.raw(query),
    // @ts-expect-error drizzle raw execute accepts params array
    params,
  );

  // drizzle raw returns { rows: [...] }
  const rows = (raw as unknown as { rows: Array<typeof escrowsTable.$inferSelect> }).rows;
  return rows?.[0] ?? null;
}

// GET /escrows
router.get("/escrows", async (req, res): Promise<void> => {
  const query = ListEscrowsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const validStatuses = ["pending", "funded", "released", "disputed", "cancelled", "completed"];
  if (query.data.status && !validStatuses.includes(query.data.status)) {
    res.status(400).json({ error: "Invalid status filter" });
    return;
  }

  const escrows = query.data.status
    ? await db
        .select()
        .from(escrowsTable)
        .where(eq(escrowsTable.status, query.data.status))
        .orderBy(desc(escrowsTable.createdAt))
    : await db.select().from(escrowsTable).orderBy(desc(escrowsTable.createdAt));

  res.json(escrows);
});

// POST /escrows
router.post("/escrows", async (req, res): Promise<void> => {
  const parsed = EscrowCreateValidator.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, description, buyerEmail, sellerEmail, amount, currency, network } = parsed.data;

  if (buyerEmail.toLowerCase() === sellerEmail.toLowerCase()) {
    res.status(400).json({ error: "Buyer and seller email addresses must be different" });
    return;
  }

  // Fetch wallet address from OKX — fail closed: no address = reject
  let walletAddress = "";
  try {
    const addresses = await getDepositAddress(currency, network);
    walletAddress = addresses[0]?.addr ?? "";
    if (!walletAddress) {
      req.log.warn({ currency, network }, "OKX returned no deposit address for this currency/network");
      res.status(502).json({
        error: "Could not retrieve a deposit address for the selected currency and network. Please try again or select a different network.",
      });
      return;
    }
  } catch (err) {
    req.log.error({ err, currency, network }, "OKX deposit address fetch failed");
    res.status(502).json({
      error: "Unable to fetch wallet address from OKX. Please check that the currency and network are supported.",
    });
    return;
  }

  const [escrow] = await db
    .insert(escrowsTable)
    .values({
      title,
      description: description ?? null,
      buyerEmail,
      sellerEmail,
      amount,
      currency,
      network,
      walletAddress,
      status: "pending",
    })
    .returning();

  sendEscrowCreated(escrow).catch((err) => req.log.error({ err }, "Email error"));
  res.status(201).json(escrow);
});

// GET /escrows/:id
router.get("/escrows/:id", async (req, res): Promise<void> => {
  const params = GetEscrowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [escrow] = await db
    .select()
    .from(escrowsTable)
    .where(eq(escrowsTable.id, params.data.id));
  if (!escrow) {
    res.status(404).json({ error: "Escrow not found" });
    return;
  }
  res.json(escrow);
});

// PATCH /escrows/:id
router.patch("/escrows/:id", async (req, res): Promise<void> => {
  const params = UpdateEscrowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = EscrowPatchValidator.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title != null) updates.title = parsed.data.title;
  if (parsed.data.description != null) updates.description = parsed.data.description;
  if (parsed.data.notes != null) updates.notes = parsed.data.notes;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [escrow] = await db
    .update(escrowsTable)
    .set(updates)
    .where(eq(escrowsTable.id, params.data.id))
    .returning();

  if (!escrow) {
    res.status(404).json({ error: "Escrow not found" });
    return;
  }
  res.json(escrow);
});

// POST /escrows/:id/fund
router.post("/escrows/:id/fund", async (req, res): Promise<void> => {
  const params = FundEscrowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = FundEscrowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Validate txHash format (basic hex string check)
  if (parsed.data.txHash && !/^[0-9a-fA-F]{40,100}$/.test(parsed.data.txHash.replace(/^0x/, ""))) {
    res.status(400).json({ error: "Invalid transaction hash format" });
    return;
  }

  // Atomic conditional update — only applies if current status is 'pending'
  const [escrow] = await db
    .update(escrowsTable)
    .set({
      status: "funded",
      txHash: parsed.data.txHash,
      notes: parsed.data.notes ?? undefined,
    })
    .where(and(eq(escrowsTable.id, params.data.id), eq(escrowsTable.status, "pending")))
    .returning();

  if (!escrow) {
    // Check if it's a 404 or a state conflict
    const [existing] = await db
      .select({ id: escrowsTable.id, status: escrowsTable.status })
      .from(escrowsTable)
      .where(eq(escrowsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Escrow not found" });
    } else {
      res.status(409).json({ error: `Cannot fund escrow with status: ${existing.status}` });
    }
    return;
  }

  sendEscrowFunded(escrow).catch((err) => req.log.error({ err }, "Email error"));
  res.json(escrow);
});

// POST /escrows/:id/release
router.post("/escrows/:id/release", async (req, res): Promise<void> => {
  const params = ReleaseEscrowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ReleaseEscrowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [escrow] = await db
    .update(escrowsTable)
    .set({ status: "released", notes: parsed.data.notes ?? undefined })
    .where(and(eq(escrowsTable.id, params.data.id), eq(escrowsTable.status, "funded")))
    .returning();

  if (!escrow) {
    const [existing] = await db
      .select({ id: escrowsTable.id, status: escrowsTable.status })
      .from(escrowsTable)
      .where(eq(escrowsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Escrow not found" });
    } else {
      res.status(409).json({ error: `Cannot release escrow with status: ${existing.status}. Escrow must be funded first.` });
    }
    return;
  }

  sendEscrowReleased(escrow).catch((err) => req.log.error({ err }, "Email error"));
  res.json(escrow);
});

// POST /escrows/:id/dispute
router.post("/escrows/:id/dispute", async (req, res): Promise<void> => {
  const params = DisputeEscrowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = DisputeEscrowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Can dispute from pending or funded
  const [escrow] = await db
    .update(escrowsTable)
    .set({ status: "disputed", notes: parsed.data.notes ?? undefined })
    .where(
      and(
        eq(escrowsTable.id, params.data.id),
        sql`status IN ('pending', 'funded')`,
      ),
    )
    .returning();

  if (!escrow) {
    const [existing] = await db
      .select({ id: escrowsTable.id, status: escrowsTable.status })
      .from(escrowsTable)
      .where(eq(escrowsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Escrow not found" });
    } else {
      res.status(409).json({ error: `Cannot dispute escrow with status: ${existing.status}` });
    }
    return;
  }

  sendEscrowDisputed(escrow).catch((err) => req.log.error({ err }, "Email error"));
  res.json(escrow);
});

// POST /escrows/:id/cancel — only allowed from 'pending' (not funded, protecting buyer)
router.post("/escrows/:id/cancel", async (req, res): Promise<void> => {
  const params = CancelEscrowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CancelEscrowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Only cancel from 'pending' — once funded, buyer has sent crypto; cancellation
  // must go through dispute resolution to protect both parties.
  const [escrow] = await db
    .update(escrowsTable)
    .set({ status: "cancelled", notes: parsed.data.notes ?? undefined })
    .where(and(eq(escrowsTable.id, params.data.id), eq(escrowsTable.status, "pending")))
    .returning();

  if (!escrow) {
    const [existing] = await db
      .select({ id: escrowsTable.id, status: escrowsTable.status })
      .from(escrowsTable)
      .where(eq(escrowsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Escrow not found" });
    } else if (existing.status === "funded") {
      res.status(409).json({
        error: "Cannot cancel a funded escrow directly. Please raise a dispute so funds can be safely resolved.",
      });
    } else {
      res.status(409).json({ error: `Cannot cancel escrow with status: ${existing.status}` });
    }
    return;
  }

  sendEscrowCancelled(escrow).catch((err) => req.log.error({ err }, "Email error"));
  res.json(escrow);
});

export default router;
