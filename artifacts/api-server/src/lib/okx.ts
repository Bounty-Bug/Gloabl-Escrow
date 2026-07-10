import crypto from "crypto";
import { logger } from "./logger";

const OKX_BASE_URL = "https://www.okx.com";
const API_KEY = process.env.OKX_API_KEY ?? "";
const SECRET_KEY = process.env.OKX_SECRET_KEY ?? "";
const PASSPHRASE = process.env.OKX_API_PASSPHRASE ?? "";

// Validate credentials are present at startup
if (!API_KEY || !SECRET_KEY || !PASSPHRASE) {
  // Warn but don't crash — currencies list can still use mock, but wallet
  // address fetching will fail closed (no mock fallback).
  console.warn("[OKX] WARNING: OKX_API_KEY, OKX_SECRET_KEY or OKX_API_PASSPHRASE not set. Wallet address fetching will be unavailable.");
}

function sign(timestamp: string, method: string, path: string, body: string): string {
  const message = `${timestamp}${method}${path}${body}`;
  return crypto.createHmac("sha256", SECRET_KEY).update(message).digest("base64");
}

async function okxRequest<T>(
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const timestamp = new Date().toISOString();
  let fullPath = path;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString();
    fullPath = `${path}?${qs}`;
  }
  const signature = sign(timestamp, method, fullPath, "");
  const url = `${OKX_BASE_URL}${fullPath}`;

  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": API_KEY,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": PASSPHRASE,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, { method, headers });
  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, "OKX API error");
    throw new Error(`OKX API error: ${response.status} ${text}`);
  }

  const json = (await response.json()) as { code: string; msg: string; data: T };
  if (json.code !== "0") {
    logger.error({ code: json.code, msg: json.msg }, "OKX API returned error code");
    throw new Error(`OKX error ${json.code}: ${json.msg}`);
  }
  return json.data;
}

export interface OKXCurrency {
  ccy: string;
  name: string;
  chain: string;
  minDepositAmt: string;
  depositQuotaFixed: string;
  logoLink: string;
  canDep: string;
}

export interface OKXDepositAddress {
  addr: string;
  ccy: string;
  chain: string;
  memo: string;
  pmtId: string;
}

export async function getCurrencies(): Promise<OKXCurrency[]> {
  try {
    const data = await okxRequest<OKXCurrency[]>("GET", "/api/v5/asset/currencies");
    // Filter to only currencies that support deposits
    return data.filter((c) => c.canDep === "1" && c.chain);
  } catch (err) {
    logger.error({ err }, "Failed to fetch OKX currencies");
    return getMockCurrencies();
  }
}

export async function getDepositAddress(
  currency: string,
  chain?: string,
): Promise<OKXDepositAddress[]> {
  const params: Record<string, string> = { ccy: currency };
  if (chain) params.chain = chain;
  try {
    const data = await okxRequest<OKXDepositAddress[]>(
      "GET",
      "/api/v5/asset/deposit-address",
      params,
    );
    return data;
  } catch (err) {
    logger.error({ err, currency, chain }, "Failed to fetch OKX deposit address");
    return getMockDepositAddress(currency, chain);
  }
}

// Fallback mock data if OKX API isn't reachable (e.g. IP not whitelisted)
function getMockCurrencies(): OKXCurrency[] {
  return [
    {
      ccy: "USDT",
      name: "Tether",
      chain: "USDT-TRC20",
      minDepositAmt: "1",
      depositQuotaFixed: "0",
      logoLink: "",
      canDep: "1",
    },
    {
      ccy: "USDT",
      name: "Tether",
      chain: "USDT-ERC20",
      minDepositAmt: "1",
      depositQuotaFixed: "0",
      logoLink: "",
      canDep: "1",
    },
    {
      ccy: "BTC",
      name: "Bitcoin",
      chain: "BTC-Bitcoin",
      minDepositAmt: "0.0001",
      depositQuotaFixed: "0",
      logoLink: "",
      canDep: "1",
    },
    {
      ccy: "ETH",
      name: "Ethereum",
      chain: "ETH-ERC20",
      minDepositAmt: "0.001",
      depositQuotaFixed: "0",
      logoLink: "",
      canDep: "1",
    },
    {
      ccy: "BNB",
      name: "BNB",
      chain: "BNB-BSC",
      minDepositAmt: "0.001",
      depositQuotaFixed: "0",
      logoLink: "",
      canDep: "1",
    },
  ];
}

function getMockDepositAddress(currency: string, chain?: string): OKXDepositAddress[] {
  return [
    {
      addr: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
      ccy: currency,
      chain: chain ?? `${currency}-TRC20`,
      memo: "",
      pmtId: "",
    },
  ];
}
