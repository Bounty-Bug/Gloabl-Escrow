---
name: OKX IP whitelist
description: OKX API 401 errors because dev server IP is not whitelisted; mock fallback behavior
---

## Problem
OKX API returns 401 with "Your IP is not included in your API key's IP whitelist" in dev.
The Replit dev server IP changes on restarts (e.g. 34.26.115.216, 35.237.178.145).

## Behavior
- `getCurrencies()` — falls back to mock currency list on OKX failure (resilient, by design)
- `getDepositAddress()` — fails CLOSED (returns error, does not fall back to mock address)
- Escrow creation rejects with 502 if deposit address cannot be fetched

**Why:** Fake wallet addresses would cause real fund loss. Currencies list is safe to mock for UX.

**How to apply:** To fix in production, whitelist the deployment IP in OKX API key settings. For dev, either whitelist the current IP or accept that currencies use mock data.
