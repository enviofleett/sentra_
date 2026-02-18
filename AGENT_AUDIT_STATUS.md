# Agent Audit Status (2026-02-16)

## Scope
- Frontend agent routes and UI surfaces
- Consultant data/context persistence
- Subscription and trial flow
- Supabase edge function registration policy
- CI signals (`test`, `build`, `lint`)

## Current Verification
- `npm run test`: PASS (`25/25`)
- `npm run build`: PASS
- `npm run lint`: PASS with warnings (temporary stabilization policy active)

## Capability Checklist
- [x] Product-level consultant launch (`ProductDetail` + drawer)
- [x] Dedicated consultant page (`/consultant`)
- [x] Plan/checkout page for consultant access (`/consultant/plans`)
- [x] Conversation context persistence (frontend context + tests)
- [x] Chat persistence tables and RLS
- [x] Consultant engagement and A/B tracking tables/policies
- [x] Subscription payment initialization function
- [x] Trial grant function (admin)
- [x] Backend access enforcement in `ai-business-consultant`
- [x] Free-access window through June 2026 implemented
- [x] Admin nav target route for AI plans (`/admin/agent-plans`)

## Remediation Applied
1. Added missing admin route:
   - `src/pages/admin/Dashboard.tsx` now includes `Route path="/agent-plans"`.
2. ESLint stabilization:
   - `eslint.config.js` now wires `eslint-plugin-react-hooks`.
   - Temporary warning-level policy applied for legacy debt hotspots.
3. Supabase function config normalization:
   - Added explicit `verify_jwt` entries for active agent-related functions in `supabase/config.toml`.
4. Consultant migration consolidation:
   - Added `supabase/migrations/20260216100000_consolidate_consultant_schema.sql`.
   - Provides idempotent canonical schema/policies and drops duplicate legacy policy names.

## Known Risks / Pending
- Lint debt remains (many warnings): type narrowing, unused imports/vars, and broad legacy `any`.
- Bundle size warning remains (`>500kb` chunk).
- Dynamic/static supabase client import warning remains.
- Need deployment validation in target Supabase environment after migration/function-config changes.

## Owners and Next Actions
1. Frontend/Platform owner:
   - Convert warning-level lint policy back to strict errors per domain as debt is reduced.
2. Backend/DB owner:
   - Apply latest migrations and confirm no policy regressions in staging.
3. Release owner:
   - Run end-to-end smoke:
     - `/consultant`, `/consultant/plans`
     - product consultant launch from product page
     - agent plan admin page
     - subscription init + webhook fulfillment
     - trial grant flow
