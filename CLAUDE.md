# CLAUDE.md

This file defines how to contribute to `Financelli`.

The main goal is always the same:
- keep the app easy to evolve
- keep each file as short and readable as possible
- separate UI, state, and business logic clearly
- protect the mobile and PWA experience as a primary use case

## Project context

- Stack: React 19 + TypeScript + Vite
- Routing: `createBrowserRouter` in `src/app/router.tsx`
- Data fetching: TanStack Query
- Backend: Supabase
- Forms: React Hook Form
- Simple local/global state: Zustand
- UI: Tailwind + base components in `src/shared/components/ui`
- App type: client-side SPA
- PWA: important product requirement
- UX target: mobile-first

Do not assume:
- SSR
- technical SEO
- file-based routing
- Next.js-style architecture

## Product priorities

When making implementation decisions, prioritize in this order:

1. Mobile-first experience
2. PWA compatibility
3. Code readability
4. Architectural simplicity
5. Reuse without over-engineering

Desktop still matters, but the main experience should work extremely well on mobile.

## Implementation philosophy

When adding or refactoring code, optimize for:

1. Readability first
2. Short files
3. Small, focused components
4. Hooks to encapsulate logic
5. Extracted pure functions when logic grows
6. Consistency with the current project structure
7. Mobile-first UI and layout
8. Compatibility with PWA and touch navigation

Avoid giant files that mix:
- UI
- business rules
- data transformations
- effects
- handlers
- fetching and mutations
all in one place

If a component becomes hard to understand in one scroll, it should probably be split.

## Preferred architecture

This project should follow a `feature/domain architecture` approach.

### Practical interpretation of this rule

- `domain/` contains core business types, concepts, and rules
- `features/` contains functional implementation by product area
- `data/` contains repositories, integrations, and backend access
- `shared/` contains base UI, cross-feature hooks, config, and common utilities

### What belongs in each layer

`src/domain/`
- business types
- pure calculations and rules
- central domain mappings

`src/features/<feature>/`
- pages
- feature components
- feature-specific hooks
- feature-specific helpers

`src/data/`
- Supabase client
- repositories
- query keys

`src/shared/`
- UI primitives
- layout
- truly shared hooks
- global stores
- config and cross-feature helpers

Do not move something into `shared/` if it still only belongs to one feature.

## Practical file size rule

There is no hard limit, but use these heuristics:

- ideal: 50-150 lines per component/hook/utility
- acceptable: 150-250 lines if readability is still strong
- above 250 lines: stop and look for extraction opportunities
- above 350 lines: strong smell, unless there is a very good reason

More important than exact line count:
- a file should have one main responsibility
- it should be understandable in less than one minute

## How to split code

### Extract hooks when:

- there is state logic that is not purely visual
- there are several `useEffect`, `useMemo`, `watch`, handlers, or derived values
- the component mixes rendering with submission logic, filters, mappings, or synchronization

Good examples:
- `useTransactionForm`
- `useTransactionsPageModel`

### Extract components when:

- a visual section has its own identity
- blocks are repeated
- the JSX return becomes too long
- part of the UI can be read and tested separately

Examples:
- `TransactionFilters`
- `InvestmentAccountCard`
- `AccountColorPicker`
- `GroupSplitEditor`

### Extract pure helpers when:

- there are calculations
- there are transformations between form values and payloads
- there are domain mappings
- there is reusable logic without hooks

Prefer placing them in:
- the same file, if they are truly local and small
- `shared/utils/`
- `domain/`
- a `*.helpers.ts` file next to the feature, if that is clearer

## Recommended structure by feature

Prefer organization by feature:

```text
src/features/<feature>/
  components/
  pages/
  hooks/          optional, when feature-specific hooks are needed
  utils/          optional, when feature-specific helpers are needed
```

If a feature grows, prefer this split:

```text
components/
  FeatureSection.tsx
  FeatureList.tsx
  FeatureEmptyState.tsx
hooks/
  useFeatureForm.ts
  useFeaturePageModel.ts
utils/
  featureMappers.ts
  featureValidation.ts
```

## React component conventions

- a component should focus on presenting and orchestrating, not containing all logic
- prefer early returns
- avoid giant ternaries inside JSX
- extract large fragments into child components
- keep handler names clear: `handleSubmit`, `handleDelete`, `handleTypeChange`
- avoid complex inline functions inside JSX
- avoid huge, dense, hard-to-scan `className` strings

Good rule:
- if the `return (...)` dominates almost the entire file, the UI may be too large
- if the logic dominates almost the entire file, it probably deserves a hook

## Hook conventions

Hooks are the preferred place to encapsulate:
- derived state
- React Hook Form integration
- React Query integration
- effects
- coordination between stores, auth, and repositories

Name hooks with clear intent:
- `useTransactionForm`
- `useAccountsFilters`
- `useGroupBalances`
- `useInvestmentsPageModel`

A hook should return:
- the required state
- handlers
- derived values ready for the UI

Avoid returning overly opaque objects if that makes reading harder.

## Mobile-first and PWA

This project should be designed mobile-first.

When implementing UI:
- start with the mobile layout
- scale up afterward for tablet and desktop
- respect the existing safe areas, bottom nav, and mobile header
- prefer comfortable touch targets
- avoid interactions that only work well on hover
- avoid modals or tables that break on small screens

When implementing PWA-related features:
- do not assume perfect connectivity or desktop-only context
- avoid flows that depend on multiple windows
- protect the standalone experience
- keep navigation simple, direct, and touch-friendly

Whenever a UI decision works well on desktop but poorly on mobile, prioritize mobile.

## Styles

Current base:
- use Tailwind first
- reuse base components from `shared/components/ui`

### Readability rule for classes

Avoid `className` strings that become huge and hard to read.

When a block of classes:
- gets too long
- is repeated in multiple places
- mixes layout, state, variants, and responsive modifiers
- makes the JSX hard to scan

it should be simplified.

Preferred options, in this order:

1. extract a component
2. extract small class constants when local and clear
3. use `cn()` or composition helpers if a similar pattern already exists
4. create a `*.module.scss` file when that gives clearer semantic names

### When to use `*.module.scss`

Do not introduce `module.scss` by default.

Use it only when it genuinely improves readability, for example:
- markup with too many utility classes
- highly visual components with complex variants
- animations, gradients, overlays, or more detailed layouts
- when a visual block becomes much clearer with semantic class names
- when mobile/desktop breakpoints make JSX noisy
- when visual states stop being clear in inline Tailwind

If you use `module.scss`:
- keep it local to the component
- use short, semantic names
- do not move logic into CSS
- continue using Tailwind utilities when they still fit
- prefer intention-revealing names such as `header`, `actions`, `summaryCard`, `floatingBar`

Practical rule:
- Tailwind for 80-90% of cases
- `module.scss` as a readability escape hatch, not as the default

## Data and domain

- central types live in `src/domain/types.ts`
- money is stored in cents
- business rules should stay outside UI whenever possible
- data access should happen through hooks/repositories, not directly inside many components

Prefer this flow:

`repo -> hook -> page/model hook -> component`

Avoid:

`page -> supabase directly`

except for very small and clearly justified cases.

## Forms

For forms with any meaningful complexity:
- extract a dedicated hook
- keep builders and mappers near the hook
- separate defaults, edit values, and payload builders

Recommended pattern:

```text
FeatureFormModal.tsx
useFeatureForm.ts
featureForm.helpers.ts   optional
```

If a modal grows too much:
- extract visual sections
- extract specific rows/fields
- extract reusable toggles and pickers

## Pages and routing

Because the project uses React Router with `createBrowserRouter`:
- new pages should fit into the existing route tree
- layout and route protection live in `src/app/router.tsx` and `Layout`
- do not create routing abstractions inspired by Next.js unless there is a strong reason

When creating new pages:
- make sure the page works on mobile first
- validate how it fits with sidebar, mobile header, and bottom nav
- avoid oversized headers or duplicated bars

## i18n

Whenever a feature is already internationalized:
- use `useT()`
- add keys in `shared/i18n/translations/en.ts`
- mirror them in `pt.ts`

Avoid introducing new hardcoded strings in already translated areas.

## Expected refactors

When touching large files, try to improve the structure while implementing.

Useful refactor signals:
- several commented blocks like "helpers", "types", "component", "effects" in the same file
- too many responsibilities inside one component
- a very long JSX return
- submit/form validation mixed into rendering
- repeated UI across modals or sections
- long and unreadable `className` strings spread through the file
- responsive classes making the markup hard to follow

Preferred refactor order:

1. extract a pure helper
2. extract a hook
3. extract a visual component
4. only then consider new abstractions

## What to avoid

- components with 400-800 lines without a very strong reason
- hooks that handle fetches, mutations, i18n, DOM, and navigation all at once without need
- overly generic utilities with vague names like `helpers.ts` or `utils.ts` inside a feature without context
- creating extra layers without clear value
- introducing patterns from other stacks that do not fit a Vite SPA
- desktop-first UI that is awkwardly adapted to mobile
- giant class strings when a component, helper, or `module.scss` would be clearer

## Brand assets

Logo and icon files live in `public/`:

| File | Use |
|---|---|
| `financelli-logo-light.svg` | Full wordmark — light mode |
| `financelli-logo-dark.svg` | Full wordmark — dark mode |
| `financelli-icon-light.svg` | Icon mark only — light mode |
| `financelli-icon-dark.svg` | Icon mark only — dark mode |
| `favicon.svg` | Favicon SVG (icon, larger fill, dark bg) |
| `favicon.ico` | Favicon ICO fallback |
| `favicon-96x96.png` | PWA icon 96px |
| `apple-touch-icon.png` | iOS home screen icon (180×180) |
| `web-app-manifest-192x192.png` | PWA maskable icon 192px |
| `web-app-manifest-512x512.png` | PWA maskable icon 512px |

Always render logos with two `<img>` tags using Tailwind dark mode classes:

```tsx
<img src="/financelli-logo-light.svg" alt="Financelli" className="h-10 dark:hidden" />
<img src="/financelli-logo-dark.svg" alt="Financelli" className="h-10 hidden dark:block" />
```

Sizes in use: `h-20` (login page), `h-12` (sidebar desktop), `h-8` (mobile header).

Do **not** use the `BrandLogo` component — it is deprecated and no longer in use.

### Favicon & PWA icons

Configured in `vite.config.ts` via `VitePWA`. The manifest is generated by the plugin — do **not** add a `site.webmanifest` to `public/` as it will conflict. The `index.html` references `favicon.svg` (primary) and `favicon.ico` (fallback) and `apple-touch-icon.png` for iOS.

**Regenerating raster assets after `favicon.svg` changes:**

`favicon-logo-light.svg` and `financelli-logo-dark.svg` are never regenerated. All other raster assets are derived from `favicon.svg` via `sharp` (already in `node_modules`):

```js
// Run from project root: node scripts/gen-icons.js  (or paste inline in node REPL)
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('public/favicon.svg');

function buildIco(bufs) {
  let offset = 6 + bufs.length * 16;
  const hdr = Buffer.alloc(6);
  hdr.writeUInt16LE(0,0); hdr.writeUInt16LE(1,2); hdr.writeUInt16LE(bufs.length,4);
  const dirs=[],imgs=[];
  for (const b of bufs) {
    const d=Buffer.alloc(16);
    d.writeUInt8(b.readUInt32BE(16)>=256?0:b.readUInt32BE(16),0);
    d.writeUInt8(b.readUInt32BE(20)>=256?0:b.readUInt32BE(20),1);
    d.writeUInt16LE(1,4);d.writeUInt16LE(32,6);
    d.writeUInt32LE(b.length,8);d.writeUInt32LE(offset,12);
    offset+=b.length;dirs.push(d);imgs.push(b);
  }
  return Buffer.concat([hdr,...dirs,...imgs]);
}

(async()=>{
  await sharp(svg).resize(96,96).png().toFile('public/favicon-96x96.png');
  await sharp(svg).resize(180,180).png().toFile('public/apple-touch-icon.png');
  await sharp(svg).resize(192,192).png().toFile('public/web-app-manifest-192x192.png');
  await sharp(svg).resize(512,512).png().toFile('public/web-app-manifest-512x512.png');
  const [p16,p32]=await Promise.all([
    sharp(svg).resize(16,16).png().toBuffer(),
    sharp(svg).resize(32,32).png().toBuffer(),
  ]);
  fs.writeFileSync('public/favicon.ico',buildIco([p16,p32]));
})();
```

## Repo-specific preferences

- preserve the feature-based organization
- reinforce feature/domain architecture
- preserve the `@/` alias
- reuse existing hooks before creating parallel paths
- keep modals and pages focused
- extract parts of `Transactions`, `Accounts`, and `Investments` whenever readability starts to degrade
- protect mobile and PWA consistency in new changes

## Checklist before closing a change

- did the file become shorter or at least clearer?
- is the difficult logic encapsulated in a hook/helper?
- is the JSX easy to scan?
- are the `className` strings still readable?
- would a `module.scss` file help here?
- do the names explain intent?
- does the change respect the current Vite SPA and router setup?
- was the UI designed mobile-first?
- is the experience still good in PWA context?
- did it reuse existing shared components where appropriate?

## Final rule

Always prefer code that a human can open today and understand quickly tomorrow.

If the choice is between:
- fewer files but one huge component
- 2 or 3 extra small, clear files

choose the second option most of the time.
