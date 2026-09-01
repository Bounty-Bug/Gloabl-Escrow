import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, escrowsTable, messagesTable } from "@workspace/db";
import { z } from "zod";
import { getAuth } from "@clerk/express";
import { getUserEmail } from "../lib/clerk";

const router: IRouter = Router();

const MessageBodySchema = z.object({
  body: z.string().min(1).max(4000),
});

/** Resolve the sender's role within the escrow */
function resolveRole(
  userEmail: string,
  buyerEmail: string,
  sellerEmail: string,
): "buyer" | "seller" | null {
  const em = userEmail.toLowerCase();
  if (em === buyerEmail.toLowerCase()) return "buyer";
  if (em === sellerEmail.toLowerCase()) return "seller";
  return null;
}

// GET /escrows/:id/messages — returns all chat messages for the escrow
router.get("/escrows/:id/messages", async (req, res): Promise<void> => {
  const escrowId = parseInt(req.params.id, 10);
  if (isNaN(escrowId)) {
    res.status(400).json({ error: "Invalid escrow id" });
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userEmail = await getUserEmail(userId);
  if (!userEmail) {
    res.status(403).json({ error: "No email on account" });
    return;
  }

  // Verify access — user must be buyer, seller, or creator
  const [escrow] = await db
    .select({
      id: escrowsTable.id,
      userId: escrowsTable.userId,
      buyerEmail: escrowsTable.buyerEmail,
      sellerEmail: escrowsTable.sellerEmail,
    })
    .from(escrowsTable)
    .where(eq(escrowsTable.id, escrowId));

  if (!escrow) {
    res.status(404).json({ error: "Escrow not found" });
    return;
  }

  const hasAccess =
    escrow.userId === userId ||
    escrow.buyerEmail.toLowerCase() === userEmail.toLowerCase() ||
    escrow.sellerEmail.toLowerCase() === userEmail.toLowerCase();

  if (!hasAccess) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.escrowId, escrowId))
    .orderBy(asc(messagesTable.createdAt));

  res.json(messages);
});

// POST /escrows/:id/messages — send a chat message
router.post("/escrows/:id/messages", async (req, res): Promise<void> => {
  const escrowId = parseInt(req.params.id, 10);
  if (isNaN(escrowId)) {
    res.status(400).json({ error: "Invalid escrow id" });
    return;
  }

  const parsed = MessageBodySchema.safeParse(req.body);
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
  if (!userEmail) {
    res.status(403).json({ error: "No email on account" });
    return;
  }

  // Verify access
  const [escrow] = await db
    .select({
      id: escrowsTable.id,
      userId: escrowsTable.userId,
      buyerEmail: escrowsTable.buyerEmail,
      sellerEmail: escrowsTable.sellerEmail,
    })
    .from(escrowsTable)
    .where(eq(escrowsTable.id, escrowId));

  if (!escrow) {
    res.status(404).json({ error: "Escrow not found" });
    return;
  }

  const role = resolveRole(userEmail, escrow.buyerEmail, escrow.sellerEmail);
  const isCreator = escrow.userId === userId;

  if (!role && !isCreator) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const senderRole = role ?? (isCreator ? "seller" : "buyer");

  const [message] = await db
    .insert(messagesTable)
    .values({
      escrowId,
      senderEmail: userEmail,
      senderRole,
      body: parsed.data.body,
    })
    .returning();

  res.status(201).json(message);
});

export default router;
