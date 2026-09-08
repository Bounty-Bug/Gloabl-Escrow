import { Router, type IRouter } from "express";
import { getCurrencies, getDepositAddress } from "../lib/okx";
import { GetDepositAddressQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /currencies
router.get("/currencies", async (req, res): Promise<void> => {
  const currencies = await getCurrencies();
  const mapped = currencies.map((c) => ({
    currency: c.ccy,
    name: c.name,
    chain: c.chain,
    minDepositAmt: c.minDepositAmt,
    depositQuotaFixed: c.depositQuotaFixed,
    logoLink: c.logoLink ?? null,
  }));
  res.json(mapped);
});

// GET /wallets/address
router.get("/wallets/address", async (req, res): Promise<void> => {
  const parsed = GetDepositAddressQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currency, chain } = parsed.data;
  const addresses = await getDepositAddress(currency, chain ?? undefined);
  const mapped = addresses.map((a) => ({
    addr: a.addr,
    currency: a.ccy,
    chain: a.chain,
    memo: a.memo ?? null,
    pmtId: a.pmtId ?? null,
  }));
  res.json(mapped);
});

export default router;
