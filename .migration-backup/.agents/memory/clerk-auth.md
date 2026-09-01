---
name: Clerk auth setup
description: Replit-managed Clerk authentication — what was wired, key patterns, pitfalls to avoid
---

## What's wired

**Server (`artifacts/api-server`)**
- `app.ts`: Clerk proxy middleware mounted before body parsers; `clerkMiddleware()` with `publishableKeyFromHost` for multi-domain support; CORS has `credentials: true, origin: true`
- `middlewares/requireAuth.ts`: checks `getAuth(req).userId`; attaches `req.userId`
- `routes/index.ts`: `requireAuth` applied to all routes except `healthRouter`

**Frontend (`artifacts/escrow-app`)**
- `App.tsx`: `ClerkProvider` wraps everything inside `WouterRouter`; `publishableKeyFromHost` resolves key; `clerkProxyUrl` from `VITE_CLERK_PROXY_URL` (empty in dev, auto-set in prod — never gate on NODE_ENV)
- Sign-in/sign-up routes: exactly `path="/sign-in/*?"` and `path="/sign-up/*?"` — the `/*?` wildcard is required for OAuth callbacks
- `<SignIn path>` / `<SignUp path>` use full browser path: `` `${basePath}/sign-in` ``
- `ClerkQueryClientCacheInvalidator` clears React Query cache on user change
- `Shell.tsx`: uses `useUser()` + `useClerk().signOut({ redirectUrl: basePath || "/" })` for user display and logout — no `/api/logout` route

**Appearance**
- Theme: `shadcn` from `@clerk/themes`; `cssLayerName: "clerk"`
- `index.css`: `@layer theme, base, clerk, components, utilities;` BEFORE `@import 'tailwindcss'`
- `vite.config.ts`: `tailwindcss({ optimize: false })` — required for Tailwind v4 to prevent broken Clerk styles in prod builds
- Logo: `public/logo.svg` — referenced as `${window.location.origin}${basePath}/logo.svg`
- Colors match the app's blue-600 (#2563eb) palette

## Key pitfalls

- `publishableKeyFromHost` must be used — never inline `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` directly as `publishableKey`
- `proxyUrl={clerkProxyUrl}` is unconditional — empty string in dev is intentional, do NOT gate it
- `<UserButton />` is intentionally NOT used — not customizable, exposes confusing Clerk-level options
- `stripBase()` helper strips base path from Clerk's `routerPush`/`routerReplace` arguments to avoid doubling
- Dev key warning ("Clerk has been loaded with development keys") is expected and normal — do not treat as a bug

**Why:** Protect all API routes from unauthenticated access; escrow data is sensitive.
