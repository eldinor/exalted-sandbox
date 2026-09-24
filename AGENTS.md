# Repository working rules

## Product scope

- `index.html` and `src/main.ts` are the production Exalted application.
- `generator/`, avatar/editor tools, and standalone HTML labs are supporting
  utilities. Do not let their assumptions redefine the authored Exalted world.
- Read `HANDOFF.md`, `CURRENT_WORK.md`, `ARCHITECTURE.md`, and the relevant
  subsystem document before changing established behaviour.

## Technical constraints

- Preserve WebGPU-only operation and Babylon.js 9.18.0 package parity unless an
  upgrade is explicitly requested.
- Preserve the ordered startup, warm-up, frame loop, depth passes, shadow passes,
  and post-processing chain in `src/main.ts`.
- Keep hot paths allocation-conscious and retain typed-array layouts.
- Keep custom WGSL registrations explicit. Babylon features installed through
  side-effect imports must be imported before use.
- Particles must not render into the custom R32F shadow cascades or opaque camera
  depth prepass.
- Do not add Babylon `FluidRenderer` to the production camera post chain without
  redesigning and validating Exalted's temporal post-processing architecture.
- Keep asset coordinate conversion consistent: chart `(x, y)` maps to Babylon
  `(-x, height, -y)`, while imported GLB transforms are already baked by the
  loader.

## Assets and authoring

- Runtime assets belong under `public/` with provenance or source notes.
- External Exalted folders are references; production runtime code must not use
  their absolute paths.
- Preserve authored prop placement unless a requested correction is documented.
- Keep terrain grounding, prop collision, visual geometry, and deformation as
  distinct responsibilities.
- Final waterfall integration waits for the authored package described in
  `WATERFALL.md`. The temporary main-app waterfall is disabled.
- Forest integration waits for replacement models and follows `FOREST_SPEC.md`.

## Validation

- Use `npm run typecheck` for TypeScript validation.
- Run relevant Node tests, with `npm test` for the complete automated suite.
- Do not run Playwright unless the user explicitly requests it.
- Do not run a production build after every edit. Build when bundle validation
  is relevant or requested.
- Do not claim visual verification when only type checks or Node tests ran.

## Change discipline

- Prefer small, reviewable changes that preserve current visual behaviour unless
  the user requested a visual change.
- Update subsystem documentation when a decision, limitation, asset contract, or
  deferred approach changes.
- Keep production TypeScript strict. Avoid broad `any`, unchecked external data,
  and assertions used only to silence errors.
- Do not convert the legacy forest or mountain demo pages merely for consistency.
- Do not restore removed displays, video surfaces, or legacy SnowFlow naming
  without an explicit request.
- Use Exalted as the product and world name. `https://exaltedgaming.gg/` is the
  project website.
