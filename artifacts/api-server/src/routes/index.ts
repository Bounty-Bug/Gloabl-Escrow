import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import healthRouter from "./health";
import escrowsRouter from "./escrows";
import cryptoRouter from "./crypto";
import statsRouter from "./stats";
import adminRouter from "./admin";

const router: IRouter = Router();

// Health check stays public
router.use(healthRouter);

// Admin routes — protected by ADMIN_SECRET header only (no Clerk required)
router.use(adminRouter);

// All other routes require a valid Clerk session
router.use(requireAuth);
router.use(escrowsRouter);
router.use(cryptoRouter);
router.use(statsRouter);

export default router;
