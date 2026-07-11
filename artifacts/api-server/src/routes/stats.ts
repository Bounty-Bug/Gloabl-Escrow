import { Router, type IRouter } from "express";
import { sql, desc, eq } from "drizzle-orm";
import { db, escrowsTable } from "@workspace/db";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

// GET /stats — only counts the current user's escrows
router.get("/stats", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      funded: sql<number>`count(*) filter (where status = 'funded')::int`,
      released: sql<number>`count(*) filter (where status = 'released')::int`,
      disputed: sql<number>`count(*) filter (where status = 'disputed')::int`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
    })
    .from(escrowsTable)
    .where(eq(escrowsTable.userId, userId));

  const volumeRows = await db
    .select({
      currency: escrowsTable.currency,
      total: sql<string>`sum(amount)::text`,
    })
    .from(escrowsTable)
    .where(eq(escrowsTable.userId, userId))
    .groupBy(escrowsTable.currency);

  const recentActivity = await db
    .select()
    .from(escrowsTable)
    .where(eq(escrowsTable.userId, userId))
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
