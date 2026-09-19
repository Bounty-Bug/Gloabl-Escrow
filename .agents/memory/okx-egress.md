---
name: OKX outbound allowlisting
description: The deployment constraint for safely IP-restricting Escrow Global's OKX API credentials
---

Production OKX credentials must be restricted to the stable outbound addresses of the API runtime. Vercel's default Function egress is dynamic, so it cannot be safely represented by one trusted IP.

**Why:** An empty OKX trusted-IP list or a guessed runtime address weakens credential security, while an incorrect allowlist causes OKX requests to fail.

**How to apply:** Enable Vercel Static IPs for the serving region and add the complete address pair to the OKX read-only key, or place the API server behind another fixed-egress host/proxy. Never store or record credential values in project memory.