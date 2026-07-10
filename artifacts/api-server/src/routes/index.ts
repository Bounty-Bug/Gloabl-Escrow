import { Router, type IRouter } from "express";
import healthRouter from "./health";
import escrowsRouter from "./escrows";
import cryptoRouter from "./crypto";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(escrowsRouter);
router.use(cryptoRouter);
router.use(statsRouter);

export default router;
