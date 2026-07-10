---
name: Routing structure
description: App routing — landing page at /, dashboard at /dashboard, inner pages use Shell layout
---

## Route map
- `/` → `pages/landing.tsx` — public landing page, no Shell, has its own navbar/footer
- `/dashboard` → `pages/dashboard.tsx` — app dashboard, uses Shell
- `/escrows` → `pages/escrows/index.tsx`
- `/escrows/new` → `pages/escrows/new.tsx`
- `/escrows/:id` → `pages/escrows/[id].tsx`
- `/wallets` → `pages/wallets.tsx`

**Why:** User wanted a proper marketing landing page at root. Dashboard moved to `/dashboard` to keep app routes under a clean prefix.

**How to apply:** When adding new app pages, add them under Shell. Landing page additions stay in `pages/landing.tsx` or a new sibling without Shell.
