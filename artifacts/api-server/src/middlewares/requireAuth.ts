import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware that enforces a valid Clerk session.
 * Attaches req.userId for downstream handlers.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  (req as any).userId = userId;
  next();
}
