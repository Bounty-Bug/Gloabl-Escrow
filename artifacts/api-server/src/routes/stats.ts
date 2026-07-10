import { Router, type IRouter } from "express";
import { sql, desc } from "drizzle-orm";
import { db, escrowsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /stats
router.get("/stats", async (_req, res): Promise<void> => {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      funded: sql<number>`count(*) filter (where status = 'funded')::int`,
      released: sql<number>`count(*) filter (where status = 'released')::int`,
      disputed: sql<number>`count(*) filter (where status = 'disputed')::int`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
    })
    .from(escrowsTable);

  const volumeRows = await db
    .select({
      currency: escrowsTable.currency,
      total: sql<string>`sum(amount)::text`,
    })
    .from(escrowsTable)
    .groupBy(escrowsTable.currency);

  const recentActivity = await db
    .select()
    .from(escrowsTable)
    .orderBy(desc(escrowsTable.updatedAt))
    .limit(5);

  res.json({
    total: counts?.total ?? 0,
    pending: counts?.pending ?? 0,
    funded: counts?.funded ?? 0,
    released: counts?.released ?? 0,
    disputed: counts?.disputed ?? 0,
    cancelled: counts?.cancelled ?? 0,
    totalVolumeByCurrency: volumeRows.map((r) => ({
      currency: r.currency,
      total: r.total ?? "0",
    })),
    recentActivity,
  });
});

export default router;
