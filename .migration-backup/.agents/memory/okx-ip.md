---
name: OKX IP whitelist
description: OKX API key requires IP whitelisting; current server IP and fallback behavior
---

## Current situation

The OKX API key has an IP whitelist restriction. The current server IP is **35.196.40.149** (this changes on Replit restarts).

**To get live OKX data:**
1. Go to OKX API key settings
2. Add `35.196.40.149` to the IP whitelist
3. Note: this IP may change when the Repl restarts — you may need to re-check and re-whitelist

## Fallback behavior

- **Currencies list**: Falls back to an expanded mock list of ~25 currencies (USDT, USDC, BTC, ETH, SOL, BNB, XRP, ADA, DOGE, DOT, MATIC, LTC, AVAX, ATOM, TON, TRX, LINK, UNI, OP, ARB, DAI, and others). Resilient by design.
- **Deposit addresses**: Falls back to chain-appropriate mock addresses (not real wallets):
  - BTC-Bitcoin → `bc1q...` bech32 format
  - EVM chains (ETH, BNB, MATIC, ARB, OP, AVAX) → `0x...` address
  - TRC20 → `T...` TRON address
  - SOL → Solana base58 address
  - XRP → `r...` + destination tag memo
  - LTC → `L...` Litecoin address
  - DOGE → `D...` Dogecoin address

**Why:** OKX API key restricts by IP. Replit dev IPs are dynamic. Mock fallback prevents service failure while allowing live deployment to work when IP is whitelisted.

**How to apply:** When OKX returns 401 errors in logs, check `35.196.40.149` or the current IP from the error message, and whitelist it in OKX settings.
