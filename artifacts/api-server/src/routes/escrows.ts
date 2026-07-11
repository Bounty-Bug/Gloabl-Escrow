import { Router, type IRouter } from "express";
import { eq, sql, and, or, desc } from "drizzle-orm";
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
import { getAuth } from "@clerk/express";
import { clerkClient, getUserEmail } from "../lib/clerk";
import { getDepositAddress } from "../lib/okx";
import {
  sendEscrowCreatedInitiator,
  sendEscrowCreatedCounterparty,
  sendEscrowFunded,
  sendEscrowReleased,
  sendEscrowDisputed,
  sendEscrowCancelled,
} from "../lib/mailer";

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
 * Returns a Drizzle filter that matches escrows the user has access to:
 * either they created it (userId) or their email is the buyer or seller.
 */
function getAccessFilter(userId: string, userEmail: string | null) {
  const ownerFilter = eq(escrowsTable.userId, userId);
  if (!userEmail) return ownerFilter;
  const em = userEmail.toLowerCase();
  return or(
    ownerFilter,
    sql`lower(${escrowsTable.buyerEmail}) = ${em}`,
    sql`lower(${escrowsTable.sellerEmail}) = ${em}`,
  )!;
}

// GET /escrows — returns escrows the user created OR is a buyer/seller in
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

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userEmail = await getUserEmail(userId);
  const accessFilter = getAccessFilter(userId, userEmail);

  const escrows = query.data.status
    ? await db
        .select()
        .from(escrowsTable)
        .where(and(accessFilter, eq(escrowsTable.status, query.data.status)))
        .orderBy(desc(escrowsTable.createdAt))
    : await db
        .select()
        .from(escrowsTable)
        .where(accessFilter)
        .orderBy(desc(escrowsTable.createdAt));

  res.json(escrows);
});

// POST /escrows — stores userId on creation
router.post("/escrows", async (req, res): Promise<void> => {
  const parsed = EscrowCreateValidator.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
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
      userId,
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

  // Send emails asynchronously — best-effort, does not block response
  ;(async () => {
    try {
      let initiatorEmail: string | null = null;
      const user = await clerkClient.users.getUser(userId);
      initiatorEmail =
        user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        null;

      if (initiatorEmail) {
        const isBuyer  = initiatorEmail.toLowerCase() === buyerEmail.toLowerCase();
        const isSeller = initiatorEmail.toLowerCase() === sellerEmail.toLowerCase();
        const counterpartyEmail = isBuyer ? sellerEmail : isSeller ? buyerEmail : null;
        const counterpartyRole  = isBuyer ? "seller" : "buyer";

        await sendEscrowCreatedInitiator(escrow, initiatorEmail);
        if (counterpartyEmail) {
          await sendEscrowCreatedCounterparty(escrow, counterpartyEmail, counterpartyRole);
        }
      } else {
        await sendEscrowCreatedCounterparty(escrow, buyerEmail, "buyer");
        await sendEscrowCreatedCounterparty(escrow, sellerEmail, "seller");
      }
    } catch (err) {
      req.log.error({ err }, "Email error on escrow created");
    }
  })();

  res.status(201).json(escrow);
});

// GET /escrows/:id — accessible by creator or buyer/seller (by email)
router.get("/escrows/:id", async (req, res): Promise<void> => {
  const params = GetEscrowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userEmail = await getUserEmail(userId);
  const accessFilter = getAccessFilter(userId, userEmail);

  const [escrow] = await db
    .select()
    .from(escrowsTable)
    .where(and(eq(escrowsTable.id, params.data.id), accessFilter));

  if (!escrow) {
    res.status(404).json({ error: "Escrow not found" });
    return;
  }
  res.json(escrow);
});

// PATCH /escrows/:id — accessible by creator or buyer/seller (by email)
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

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
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

  const userEmail = await getUserEmail(userId);
  const accessFilter = getAccessFilter(userId, userEmail);

  const [escrow] = await db
    .update(escrowsTable)
    .set(updates)
    .where(and(eq(escrowsTable.id, params.data.id), accessFilter))
    .returning();

  if (!escrow) {
    res.status(404).json({ error: "Escrow not found" });
    return;
  }
  res.json(escrow);
});

// POST /escrows/:id/fund — accessible by creator or buyer/seller
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

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (parsed.data.txHash && !/^[0-9a-fA-F]{40,100}$/.test(parsed.data.txHash.replace(/^0x/, ""))) {
    res.status(400).json({ error: "Invalid transaction hash format" });
    return;
  }

  const userEmail = await getUserEmail(userId);
  const accessFilter = getAccessFilter(userId, userEmail);

  const [escrow] = await db
    .update(escrowsTable)
    .set({
      status: "funded",
      txHash: parsed.data.txHash,
      notes: parsed.data.notes ?? undefined,
    })
    .where(
      and(
        eq(escrowsTable.id, params.data.id),
        accessFilter,
        eq(escrowsTable.status, "pending"),
      ),
    )
    .returning();

  if (!escrow) {
    const [existing] = await db
      .select({ id: escrowsTable.id, status: escrowsTable.status })
      .from(escrowsTable)
      .where(and(eq(escrowsTable.id, params.data.id), accessFilter));
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

// POST /escrows/:id/release — accessible by creator or buyer/seller
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

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userEmail = await getUserEmail(userId);
  const accessFilter = getAccessFilter(userId, userEmail);

  const [escrow] = await db
    .update(escrowsTable)
    .set({ status: "released", notes: parsed.data.notes ?? undefined })
    .where(
      and(
        eq(escrowsTable.id, params.data.id),
        accessFilter,
        eq(escrowsTable.status, "funded"),
      ),
    )
    .returning();

  if (!escrow) {
    const [existing] = await db
      .select({ id: escrowsTable.id, status: escrowsTable.status })
      .from(escrowsTable)
      .where(and(eq(escrowsTable.id, params.data.id), accessFilter));
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

// POST /escrows/:id/dispute — accessible by creator or either party
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

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userEmail = await getUserEmail(userId);
  const accessFilter = getAccessFilter(userId, userEmail);

  const [escrow] = await db
    .update(escrowsTable)
    .set({ status: "disputed", notes: parsed.data.notes ?? undefined })
    .where(
      and(
        eq(escrowsTable.id, params.data.id),
        accessFilter,
        sql`status IN ('pending', 'funded')`,
      ),
    )
    .returning();

  if (!escrow) {
    const [existing] = await db
      .select({ id: escrowsTable.id, status: escrowsTable.status })
      .from(escrowsTable)
      .where(and(eq(escrowsTable.id, params.data.id), accessFilter));
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

// POST /escrows/:id/cancel — accessible by creator or buyer/seller, only from 'pending'
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

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userEmail = await getUserEmail(userId);
  const accessFilter = getAccessFilter(userId, userEmail);

  const [escrow] = await db
    .update(escrowsTable)
    .set({ status: "cancelled", notes: parsed.data.notes ?? undefined })
    .where(
      and(
        eq(escrowsTable.id, params.data.id),
        accessFilter,
        eq(escrowsTable.status, "pending"),
      ),
    )
    .returning();

  if (!escrow) {
    const [existing] = await db
      .select({ id: escrowsTable.id, status: escrowsTable.status })
      .from(escrowsTable)
      .where(and(eq(escrowsTable.id, params.data.id), accessFilter));
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
