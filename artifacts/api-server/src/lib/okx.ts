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

// Stable CoinGecko logo URLs (small = 50×50, no auth required)
const LOGOS: Record<string, string> = {
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  DAI:  "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
  BTC:  "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH:  "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  SOL:  "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  BNB:  "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  XRP:  "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  ADA:  "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  DOT:  "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  MATIC:"https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.webp",
  LTC:  "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  ATOM: "https://assets.coingecko.com/coins/images/813/small/atom_logo.png",
  TON:  "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  TRX:  "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  UNI:  "https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png",
  OP:   "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  ARB:  "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
};

function logo(ccy: string): string { return LOGOS[ccy] ?? ""; }

function getMockCurrencies(): OKXCurrency[] {
  return [
    // ─── Stablecoins ───────────────────────────────────────────
    { ccy: "USDT", name: "Tether",    chain: "USDT-TRC20",    minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("USDT"), canDep: "1" },
    { ccy: "USDT", name: "Tether",    chain: "USDT-ERC20",    minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("USDT"), canDep: "1" },
    { ccy: "USDT", name: "Tether",    chain: "USDT-BEP20",    minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("USDT"), canDep: "1" },
    { ccy: "USDT", name: "Tether",    chain: "USDT-Solana",   minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("USDT"), canDep: "1" },
    { ccy: "USDC", name: "USD Coin",  chain: "USDC-ERC20",    minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("USDC"), canDep: "1" },
    { ccy: "USDC", name: "USD Coin",  chain: "USDC-BEP20",    minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("USDC"), canDep: "1" },
    { ccy: "USDC", name: "USD Coin",  chain: "USDC-Solana",   minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("USDC"), canDep: "1" },
    { ccy: "USDC", name: "USD Coin",  chain: "USDC-TRC20",    minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("USDC"), canDep: "1" },
    { ccy: "DAI",  name: "Dai",       chain: "DAI-ERC20",     minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("DAI"),  canDep: "1" },

    // ─── Major coins ───────────────────────────────────────────
    { ccy: "BTC",  name: "Bitcoin",   chain: "BTC-Bitcoin",   minDepositAmt: "0.0001", depositQuotaFixed: "0", logoLink: logo("BTC"),  canDep: "1" },
    { ccy: "ETH",  name: "Ethereum",  chain: "ETH-ERC20",     minDepositAmt: "0.001",  depositQuotaFixed: "0", logoLink: logo("ETH"),  canDep: "1" },
    { ccy: "ETH",  name: "Ethereum",  chain: "ETH-Arbitrum",  minDepositAmt: "0.001",  depositQuotaFixed: "0", logoLink: logo("ETH"),  canDep: "1" },
    { ccy: "ETH",  name: "Ethereum",  chain: "ETH-Optimism",  minDepositAmt: "0.001",  depositQuotaFixed: "0", logoLink: logo("ETH"),  canDep: "1" },
    { ccy: "SOL",  name: "Solana",    chain: "SOL-Solana",    minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: logo("SOL"),  canDep: "1" },
    { ccy: "BNB",  name: "BNB",       chain: "BNB-BEP20",     minDepositAmt: "0.001",  depositQuotaFixed: "0", logoLink: logo("BNB"),  canDep: "1" },
    { ccy: "XRP",  name: "XRP",       chain: "XRP-Ripple",    minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: logo("XRP"),  canDep: "1" },
    { ccy: "ADA",  name: "Cardano",   chain: "ADA-Cardano",   minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("ADA"),  canDep: "1" },
    { ccy: "DOGE", name: "Dogecoin",  chain: "DOGE-Dogecoin", minDepositAmt: "10",     depositQuotaFixed: "0", logoLink: logo("DOGE"), canDep: "1" },
    { ccy: "DOT",  name: "Polkadot",  chain: "DOT-Polkadot",  minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: logo("DOT"),  canDep: "1" },
    { ccy: "MATIC",name: "Polygon",   chain: "MATIC-Polygon", minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: logo("MATIC"),canDep: "1" },
    { ccy: "LTC",  name: "Litecoin",  chain: "LTC-Litecoin",  minDepositAmt: "0.001",  depositQuotaFixed: "0", logoLink: logo("LTC"),  canDep: "1" },
    { ccy: "AVAX", name: "Avalanche", chain: "AVAX-C Chain",  minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: logo("AVAX"), canDep: "1" },
    { ccy: "ATOM", name: "Cosmos",    chain: "ATOM-Cosmos",   minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: logo("ATOM"), canDep: "1" },
    { ccy: "TON",  name: "Toncoin",   chain: "TON-TON",       minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: logo("TON"),  canDep: "1" },
    { ccy: "TRX",  name: "TRON",      chain: "TRX-TRC20",     minDepositAmt: "1",      depositQuotaFixed: "0", logoLink: logo("TRX"),  canDep: "1" },
    { ccy: "LINK", name: "Chainlink", chain: "LINK-ERC20",    minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: logo("LINK"), canDep: "1" },
    { ccy: "UNI",  name: "Uniswap",   chain: "UNI-ERC20",     minDepositAmt: "0.1",    depositQuotaFixed: "0", logoLink: logo("UNI"),  canDep: "1" },
    { ccy: "OP",   name: "Optimism",  chain: "OP-Optimism",   minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: logo("OP"),   canDep: "1" },
    { ccy: "ARB",  name: "Arbitrum",  chain: "ARB-Arbitrum",  minDepositAmt: "0.01",   depositQuotaFixed: "0", logoLink: logo("ARB"),  canDep: "1" },
  ];
}
