import { Router, type IRouter } from "express";
import { eq, sql, desc, ilike, or } from "drizzle-orm";
import { db, escrowsTable } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

const router: IRouter = Router();

// ── Admin key middleware ──────────────────────────────────────────────────────
// Reads ADMIN_SECRET from the environment. All /admin/* routes require the
// caller to send it in the x-admin-key header.
function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Admin access is not configured on this server." });
    return;
  }
  const provided = req.headers["x-admin-key"];
  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Invalid or missing admin key." });
    return;
  }
  next();
}

router.use("/admin", requireAdminKey);

// ── GET /admin/stats ─────────────────────────────────────────────────────────
router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [counts] = await db.select({
    total:     sql<number>`count(*)::int`,
    pending:   sql<number>`count(*) filter (where status = 'pending')::int`,
    funded:    sql<number>`count(*) filter (where status = 'funded')::int`,
    released:  sql<number>`count(*) filter (where status = 'released')::int`,
    disputed:  sql<number>`count(*) filter (where status = 'disputed')::int`,
    cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
  }).from(escrowsTable);

  const volumeRows = await db.select({
    currency: escrowsTable.currency,
    total: sql<string>`sum(amount)::text`,
    count: sql<number>`count(*)::int`,
  }).from(escrowsTable).groupBy(escrowsTable.currency);

  const userCountRow = await db.select({
    uniqueUsers: sql<number>`count(distinct user_id)::int`,
  }).from(escrowsTable);

  res.json({
    counts: counts ?? { total: 0, pending: 0, funded: 0, released: 0, disputed: 0, cancelled: 0 },
    volumeByCurrency: volumeRows,
    uniqueUsers: userCountRow[0]?.uniqueUsers ?? 0,
  });
});

// ── GET /admin/escrows ───────────────────────────────────────────────────────
// Query params: ?status=pending&search=alice&userId=xxx&limit=50&offset=0
router.get("/admin/escrows", async (req, res): Promise<void> => {
  const { status, search, userId, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const limitN  = Math.min(Math.max(parseInt(limit, 10)  || 50,  1), 200);
  const offsetN = Math.max(parseInt(offset, 10) || 0, 0);

  const conditions: ReturnType<typeof eq>[] = [];

  if (status) conditions.push(eq(escrowsTable.status, status as any));
  if (userId) conditions.push(eq(escrowsTable.userId, userId));

  let query = db.select().from(escrowsTable).orderBy(desc(escrowsTable.createdAt)).limit(limitN).offset(offsetN);

  // Build where
  const allConditions = [...conditions];
  if (search) {
    const s = `%${search}%`;
    allConditions.push(
      or(
        ilike(escrowsTable.title, s),
        ilike(escrowsTable.buyerEmail, s),
        ilike(escrowsTable.sellerEmail, s),
        ilike(escrowsTable.userId, s),
      ) as any,
    );
  }

  const rows = allConditions.length > 0
    ? await db.select().from(escrowsTable)
        .where(allConditions.length === 1 ? allConditions[0] : sql`${allConditions.reduce((a, b) => sql`${a} AND ${b}`)}`)
        .orderBy(desc(escrowsTable.createdAt))
        .limit(limitN)
        .offset(offsetN)
    : await db.select().from(escrowsTable)
        .orderBy(desc(escrowsTable.createdAt))
        .limit(limitN)
        .offset(offsetN);

  // Total count for pagination
  const [{ total }] = await db.select({
    total: sql<number>`count(*)::int`,
  }).from(escrowsTable);

  res.json({ escrows: rows, total, limit: limitN, offset: offsetN });
});

// ── GET /admin/escrows/:id ───────────────────────────────────────────────────
router.get("/admin/escrows/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [escrow] = await db.select().from(escrowsTable).where(eq(escrowsTable.id, id));
  if (!escrow) { res.status(404).json({ error: "Escrow not found" }); return; }
  res.json(escrow);
});

// ── PATCH /admin/escrows/:id/status ─────────────────────────────────────────
router.patch("/admin/escrows/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const validStatuses = ["pending", "funded", "released", "disputed", "cancelled"];
  const { status, notes } = req.body as { status?: string; notes?: string };

  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
    return;
  }

  const [escrow] = await db
    .update(escrowsTable)
    .set({ status: status as any, notes: notes ?? undefined, updatedAt: new Date() })
    .where(eq(escrowsTable.id, id))
    .returning();

  if (!escrow) { res.status(404).json({ error: "Escrow not found" }); return; }
  res.json(escrow);
});

// ── PATCH /admin/escrows/:id ─────────────────────────────────────────────────
// Admin can update title, description, notes, walletAddress on any escrow
router.patch("/admin/escrows/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const allowed = ["title", "description", "notes", "walletAddress", "txHash"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }
  updates.updatedAt = new Date();

  const [escrow] = await db.update(escrowsTable).set(updates).where(eq(escrowsTable.id, id)).returning();
  if (!escrow) { res.status(404).json({ error: "Escrow not found" }); return; }
  res.json(escrow);
});

// ── DELETE /admin/escrows/:id ────────────────────────────────────────────────
router.delete("/admin/escrows/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(escrowsTable).where(eq(escrowsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Escrow not found" }); return; }
  res.json({ deleted: true, id: deleted.id });
});

export default router;
