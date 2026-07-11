import crypto from "crypto";
import { logger } from "./logger";

const OKX_BASE_URL = "https://www.okx.com";
const API_KEY = process.env.OKX_API_KEY ?? "";
const SECRET_KEY = process.env.OKX_SECRET_KEY ?? "";
const PASSPHRASE = process.env.OKX_API_PASSPHRASE ?? "";

if (!API_KEY || !SECRET_KEY || !PASSPHRASE) {
  console.warn("[OKX] WARNING: OKX credentials not set. Falling back to mock data.");
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
    return data.filter((c) => c.canDep === "1" && c.chain);
  } catch (err) {
    logger.warn({ err }, "OKX currencies unavailable — using mock list");
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
    logger.warn({ err, currency, chain }, "OKX deposit address unavailable — using mock address");
    return getMockDepositAddress(currency, chain);
  }
}

// ---------------------------------------------------------------------------
// Mock data — used when OKX API isn't reachable (e.g. IP not yet whitelisted)
// Addresses are realistic-format per chain but NOT real wallet addresses.
// ---------------------------------------------------------------------------

function chainType(chain: string): "btc" | "evm" | "tron" | "sol" | "xrp" | "ltc" | "doge" | "dot" | "ada" | "atom" | "ton" {
  const c = chain.toUpperCase();
  if (c.includes("BTC") || c.includes("BITCOIN")) return "btc";
  if (c.includes("TRC20") || c.includes("TRON")) return "tron";
  if (c.includes("SOL") || c.includes("SOLANA")) return "sol";
  if (c.includes("XRP") || c.includes("RIPPLE")) return "xrp";
  if (c.includes("LTC") || c.includes("LITECOIN")) return "ltc";
  if (c.includes("DOGE")) return "doge";
  if (c.includes("DOT") || c.includes("POLKADOT")) return "dot";
  if (c.includes("ADA") || c.includes("CARDANO")) return "ada";
  if (c.includes("ATOM") || c.includes("COSMOS")) return "atom";
  if (c.includes("TON")) return "ton";
  return "evm"; // ETH, BNB, MATIC, ARB, OP, AVAX, etc.
}

function getMockDepositAddress(currency: string, chain?: string): OKXDepositAddress[] {
  const chainStr = chain ?? `${currency}-Unknown`;
  const type = chainType(chainStr);

  const addresses: Record<string, { addr: string; memo?: string }> = {
    btc:  { addr: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
    evm:  { addr: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" },
    tron: { addr: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE" },
    sol:  { addr: "DRpbCBMxVnDK7maPMqYShnqDuEjLSD5Z9Z9qUhQnrVFb" },
    xrp:  { addr: "rN7n3473SaZBCG4dFL83w7PB5WGdGqLoxm", memo: "987654321" },
    ltc:  { addr: "LTsHwnnoMnEQsRqBjBVBhiuvRBMSF6i8WT" },
    doge: { addr: "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L" },
    dot:  { addr: "1FRMM8PEiWXYax7rpS6X4XZX1aAAxSWx1CrKTyrVYhV24fg" },
    ada:  { addr: "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jkta87ztx7mqcrfga9mlcve3uneh4wj6gveq3zn7xjnsvzn9z" },
    atom: { addr: "cosmos1yw4xvtc43me9scqfr2jr2gzvcxd3a5y4qzyd0k" },
    ton:  { addr: "UQBFXEVuGFVp0cTqbZb6X7V0v5J3z0EEu1YUbMp0o3GR5hQo" },
  };

  const { addr, memo = "" } = addresses[type];
  return [{ addr, ccy: currency, chain: chainStr, memo, pmtId: "" }];
}

function getMockCurrencies(): OKXCurrency[] {
  return [
    // ─── Stablecoins ───────────────────────────────────────────
    { ccy: "USDT", name: "Tether",           chain: "USDT-TRC20",   minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/58f73A71B70E531.png", canDep: "1" },
    { ccy: "USDT", name: "Tether",           chain: "USDT-ERC20",   minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/58f73A71B70E531.png", canDep: "1" },
    { ccy: "USDT", name: "Tether",           chain: "USDT-Solana",  minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/58f73A71B70E531.png", canDep: "1" },
    { ccy: "USDC", name: "USD Coin",         chain: "USDC-ERC20",   minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/F68B76F6D3D6B2.png",  canDep: "1" },
    { ccy: "USDC", name: "USD Coin",         chain: "USDC-Solana",  minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/F68B76F6D3D6B2.png",  canDep: "1" },
    { ccy: "USDC", name: "USD Coin",         chain: "USDC-TRC20",   minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/F68B76F6D3D6B2.png",  canDep: "1" },
    { ccy: "DAI",  name: "Dai",              chain: "DAI-ERC20",    minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: "",                                                                  canDep: "1" },

    // ─── Major coins ───────────────────────────────────────────
    { ccy: "BTC",  name: "Bitcoin",          chain: "BTC-Bitcoin",  minDepositAmt: "0.0001", depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/EB1F9E4A3A6A37.png", canDep: "1" },
    { ccy: "ETH",  name: "Ethereum",         chain: "ETH-ERC20",    minDepositAmt: "0.001",  depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/34DB6E6AF5E53B.png", canDep: "1" },
    { ccy: "SOL",  name: "Solana",           chain: "SOL-Solana",   minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/3AD4960A8BCE5D.png", canDep: "1" },
    { ccy: "BNB",  name: "BNB",              chain: "BNB-BSC",      minDepositAmt: "0.001",  depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/9B2B01BE1B53F2.png", canDep: "1" },
    { ccy: "XRP",  name: "XRP",              chain: "XRP-Ripple",   minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/3D21B3FE8D67B0.png", canDep: "1" },
    { ccy: "ADA",  name: "Cardano",          chain: "ADA-Cardano",  minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: "",                                                                  canDep: "1" },
    { ccy: "DOGE", name: "Dogecoin",         chain: "DOGE-Dogecoin",minDepositAmt: "10",     depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/BF5D8DB8DB43B0.png", canDep: "1" },
    { ccy: "DOT",  name: "Polkadot",         chain: "DOT-Polkadot", minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: "",                                                                  canDep: "1" },
    { ccy: "MATIC",name: "Polygon",          chain: "MATIC-Polygon",minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/95BFEA0E3C3D9B.png", canDep: "1" },
    { ccy: "LTC",  name: "Litecoin",         chain: "LTC-Litecoin", minDepositAmt: "0.001",  depositQuotaFixed: "0", logoLink: "",                                                                  canDep: "1" },
    { ccy: "AVAX", name: "Avalanche",        chain: "AVAX-C Chain", minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/17A4D44E6FB3EF.png", canDep: "1" },
    { ccy: "ATOM", name: "Cosmos Hub",       chain: "ATOM-Cosmos",  minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: "",                                                                  canDep: "1" },
    { ccy: "TON",  name: "Toncoin",          chain: "TON-TON",      minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/49E85BDBBD5E0.png",  canDep: "1" },
    { ccy: "TRX",  name: "TRON",             chain: "TRX-TRC20",    minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/5D0CAAD68A0C24.png", canDep: "1" },
    { ccy: "LINK", name: "Chainlink",        chain: "LINK-ERC20",   minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: "",                                                                  canDep: "1" },
    { ccy: "UNI",  name: "Uniswap",          chain: "UNI-ERC20",    minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: "",                                                                  canDep: "1" },
    { ccy: "OP",   name: "Optimism",         chain: "OP-Optimism",  minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: "",                                                                  canDep: "1" },
    { ccy: "ARB",  name: "Arbitrum",         chain: "ARB-Arbitrum", minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: "https://static.okx.com/cdn/assets/imgs/247/E2EB155A23B3D.png",  canDep: "1" },
  ];
}
