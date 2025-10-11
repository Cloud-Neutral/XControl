# Homepage Next.js Node Feature Audit

This document lists Node.js-specific features and Next.js integrations used by the homepage application. Each item notes where the feature appears and why it may need refactoring when targeting non-Node runtimes.

## Node built-in module & runtime usage
- **Environment variables via `process.env`** – Cookie handling and feature gating utilities rely on Node's `process.env`, including secure cookie toggles and runtime environment detection. Consider abstracting these lookups for cross-runtime compatibility.【F:ui/homepage/lib/authGateway.ts†L9-L54】【F:ui/homepage/lib/serviceConfig.ts†L137-L178】【F:ui/homepage/lib/featureFlags.ts†L31-L44】
- **Client components reading env vars** – UI logic still accesses `process.env`, which is only available at build time in Next.js. Replace with runtime config or public env exports before moving to a different platform.【F:ui/homepage/app/components/insight/store/useInsightState.ts†L58-L69】【F:ui/homepage/app/login/LoginContent.tsx†L57-L66】
- **`Buffer` polyfill expectations** – Sharing-state utilities fall back to Node's `Buffer` when browser helpers are absent. Ensure equivalent encoding helpers exist if the Node polyfill is removed.【F:ui/homepage/app/components/insight/store/useInsightState.ts†L34-L52】
- **`node:` namespace imports** – Vitest configuration uses `node:path` and `node:url` to resolve workspace paths. Replace with URL helpers or bundler aliases for non-Node runtimes.【F:ui/homepage/vitest.config.ts†L1-L31】

## Dynamic import / `require` usage
- **On-demand PDF renderer** – The document reader loads `react-pdf` dynamically to avoid shipping the worker bundle to all routes. Any bundler change must preserve this async import pattern.【F:ui/homepage/app/docs/[collection]/[version]/DocReader.tsx†L270-L293】
- **Client-only grid layout** – `react-grid-layout` is imported through `next/dynamic` with SSR disabled and a custom `WidthProvider` wrapper. Alternative runtimes must support equivalent client-side hydration flows.【F:ui/homepage/app/components/insight/layout/WorkspaceGrid.tsx†L1-L83】

## Build tooling and Webpack/Babel configuration
- **Custom Webpack rule for YAML** – `next.config.mjs` injects a loader that treats `.yml/.yaml` files as raw sources, and configures rewrites/static export toggles. Any migration must replicate this rule or provide another way to read runtime service config.【F:ui/homepage/next.config.mjs†L43-L68】
- **PostCSS/Tailwind pipeline** – PostCSS and Tailwind configs power styling, so bundlers must continue to run these plugins during build steps.【F:ui/homepage/postcss.config.mjs†L1-L8】【F:ui/homepage/tailwind.config.mjs†L1-L15】
- **Testing aliases in Vitest** – Path aliases for component, i18n, lib, and type imports are resolved in Vitest via Node path utilities. Update aliases when changing the module resolver.【F:ui/homepage/vitest.config.ts†L19-L31】

## Next.js-specific APIs & patterns
- **Route configuration exports** – Many routes set `dynamic`, `dynamicParams`, `revalidate`, and `metadata` exports, which are Next.js-specific and must be rethought outside the Next runtime.【F:ui/homepage/app/register/page.tsx†L1-L26】【F:ui/homepage/app/download/[...segments]/page.tsx†L1-L125】【F:ui/homepage/app/docs/[collection]/[version]/page.tsx†L1-L76】【F:ui/homepage/app/layout.tsx†L1-L17】
- **Data generation helpers** – Static param generators (`generateStaticParams`) drive build-time routing for docs and download pages; equivalent prerender hooks are required in other frameworks.【F:ui/homepage/app/download/[...segments]/page.tsx†L16-L60】【F:ui/homepage/app/docs/[collection]/page.tsx†L8-L37】【F:ui/homepage/app/docs/[collection]/[version]/page.tsx†L27-L41】
- **Navigation & linking** – Client components rely on `next/navigation` hooks (`useRouter`, `usePathname`, `useSearchParams`) and `next/link` for routing. Replacements must provide router APIs with the same ergonomics.【F:ui/homepage/app/panel/layout.tsx†L1-L108】【F:ui/homepage/app/register/RegisterContent.tsx†L3-L133】【F:ui/homepage/app/404/page.tsx†L1-L22】【F:ui/homepage/pages/500.tsx†L1-L18】
- **App entrypoints** – The mix of App Router (`app/`) and legacy Pages Router (`pages/_app.tsx`, `pages/500.tsx`) shows hybrid usage that depends on Next's special file system conventions.【F:ui/homepage/app/AppProviders.tsx†L1-L11】【F:ui/homepage/pages/_app.tsx†L1-L14】

## API route dependencies
- **Edge/server handler signatures** – API routes use `NextRequest`, `NextResponse`, and `cookies()` helpers, plus the Web Fetch API on the server. Refactors must provide equivalent request/response abstractions.【F:ui/homepage/app/api/auth/login/route.ts†L1-L124】【F:ui/homepage/app/api/auth/session/route.ts†L1-L128】【F:ui/homepage/app/api/auth/mfa/setup/route.ts†L1-L92】【F:ui/homepage/app/api/auth/mfa/status/route.ts†L1-L50】
- **Standard `Request` handler** – The Ask AI proxy uses the plain Web `Request` signature and `Response.json`, assuming Next's runtime polyfills. Alternate frameworks must support these Web APIs or offer adapters.【F:ui/homepage/app/api/askai/route.ts†L1-L13】

## Next.js & npm dependency highlights
- **Core framework & React stack** – The project depends on Next 14, React 18, and related tooling such as SWC ESLint config. Replacement stacks must align with these expectations.【F:ui/homepage/package.json†L14-L46】
- **Feature libraries** – Dynamic imports correspond to dependencies like `react-pdf` and `react-grid-layout`; ensure their SSR constraints are handled in any migration.【F:ui/homepage/package.json†L14-L29】【F:ui/homepage/app/docs/[collection]/[version]/DocReader.tsx†L270-L293】【F:ui/homepage/app/components/insight/layout/WorkspaceGrid.tsx†L23-L83】

