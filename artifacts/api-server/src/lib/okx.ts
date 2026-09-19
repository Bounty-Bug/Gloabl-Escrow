import crypto from "crypto";
import { logger } from "./logger";

const OKX_BASE_URL = "https://www.okx.com";
const API_KEY = process.env.OKX_API_KEY ?? "";
const SECRET_KEY = process.env.OKX_SECRET_KEY ?? "";
const PASSPHRASE = process.env.OKX_API_PASSPHRASE ?? "";

function requireCredentials(): void {
  const missing = [
    !API_KEY && "OKX_API_KEY",
    !SECRET_KEY && "OKX_SECRET_KEY",
    !PASSPHRASE && "OKX_API_PASSPHRASE",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(`OKX credentials are not configured: ${missing.join(", ")}`);
  }
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
  requireCredentials();

  const timestamp = new Date().toISOString();
  let fullPath = path;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString();
    fullPath = `${path}?${qs}`;
  }

  const signature = sign(timestamp, method, fullPath, "");
  const response = await fetch(`${OKX_BASE_URL}${fullPath}`, {
    method,
    headers: {
      "OK-ACCESS-KEY": API_KEY,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": PASSPHRASE,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, "OKX API error");
    throw new Error(`OKX API error: ${response.status}`);
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
    return data.filter((currency) => currency.canDep === "1" && Boolean(currency.chain));
  } catch (err) {
    logger.error({ err }, "OKX currencies unavailable");
    throw err;
  }
}

export async function getDepositAddress(
  currency: string,
  chain?: string,
): Promise<OKXDepositAddress[]> {
  const params: Record<string, string> = { ccy: currency };
  if (chain) params.chain = chain;

  try {
    return await okxRequest<OKXDepositAddress[]>(
      "GET",
      "/api/v5/asset/deposit-address",
      params,
    );
  } catch (err) {
    logger.error({ err, currency, chain }, "OKX deposit address unavailable");
    throw err;
  }
}