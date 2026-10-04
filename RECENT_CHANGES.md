# Exalted Controls and Recent Changes

This note records the current controls and the latest implementation changes in
the playable Exalted application. Grass Lab changes are listed separately
because the lab remains a supporting performance utility.

## Current controls

| Input | Action |
| --- | --- |
| Click scene | Capture the mouse and look around |
| `Esc` | Release the mouse and use the world-location interface |
| `WASD` or arrow keys | Camera-relative movement; also controls swimming and airborne movement |
| `Shift` | Run on land or swim faster |
| Hold right mouse button | Surf |
| `F` | Rocket-jump fire blast |
| `Space` | Start Fly; while flying, hold to keep rising |
| `Ctrl` | Descend during Fly |
| `Ctrl+Shift` | Descend and land very quickly during Fly |
| `P` | Capture the current postprocessed scene as a PNG |
| `Ctrl+I` | Toggle the dynamically loaded Babylon Inspector |
| `F1` or backtick | Toggle the performance/debug overlay |
| `1` | Sweep |
| Hold `2` | Ribbon |
| `3` | Bloom |
| `4` | Crystallise |
| `5` | Vortex |
| `6` | Rift |
| Hold `7` | Aegis |
| `8` | Avalanche |
| `9` | Thaw |

### Airborne combinations

- Repeated `F` blasts add upward impulse, up to the velocity cap, so the avatar
  can climb toward high terrain.
- `WASD` gives fast camera-relative air control during a rocket jump.
- Pressing `Space` during a rocket jump transfers into controlled Fly while
  preserving the current ascent.
- Pressing `F` during Fly adds the explosive impulse and VFX without cancelling
  Fly.
- During Fly, use `WASD` for fast horizontal movement, hold `Space` to rise,
  `Ctrl` to descend, or `Ctrl+Shift` for a rapid landing.

## Recent main-app changes

### Desert trunk collisions

- Added missing solid classification for `searsia_burchellii_twigs`; its woody
  stems now block the avatar and camera while the leaf material stays passable.
- Extracted collider construction into a shared geometry helper so real-asset
  regression tests exercise the production path. Density selection still runs
  before both instance batching and collision extraction.
- Verified actual Searsia, quiver, dead-trunk and cactus geometry against walking,
  fast surfing and camera sweeps after height transfer. GPU interaction review
  remains pending; no broad foliage collisions were added.

### Desert density

- Reduced all desert prop categories to approximately 25% of authored placements
  in the half-size world, replacing the earlier large-boulder-only thinning.
- Selection is stable across reloads and terrain modes, ignores elevation, and
  keeps multi-part props together. Removed props have no collision cylinders.
- A real-asset Node check retained 3,917 of 15,946 material primitives (24.6%);
  near Desert Start it retained 648 of 2,641 (24.5%). These are placement counts,
  not measured GPU draw-call reductions. Visual/performance review is pending.

### Surf particles after location changes

- Fixed the shared spray mesh remaining hidden after a world-location teleport.
  New live particles now restore visibility; the empty pool hides the mesh.
- This affects snow and sand surf spray, footfalls, and other shared spray
  emitters with either heightmap or GLB terrain. Biome classification and the
  custom depth/shadow pass exclusions are unchanged.
- Added Node regression coverage for emission, expiry, and repeated teleports
  on elevated snow and sand terrain. GPU appearance still needs visual review.

### Rocket jump

- Added the `F` rocket-jump action with a short cooldown, ballistic gravity,
  repeated upward impulses, airborne steering, terrain/prop collision, and
  water-surface landing.
- Added GPU fire, smoke, embers and sparks, with an orange ignition ring,
  shockwave, debris and persistent crater treatment.
- Rocket jump and Fly now transition and combine without cancelling one another.

### Fly

- Flight lasts 15 seconds and has a 5-second cooldown after landing.
- Holding `Space` now continues gaining altitude.
- `Ctrl` now descends at 7 m/s and `Ctrl+Shift` at 26 m/s during Fly.
- When Fly expires at high altitude, the avatar accelerates downward under
  gravity to a 24 m/s terminal speed instead of drifting down slowly.
- Air movement uses the same fast camera-relative direction controls as the
  rocket-jump airborne phase.

### Swimming and lake

- Swimming uses the authored lake footprint, depth hysteresis, buoyancy,
  collision-aware movement, stroke splashes and lake ripples.
- The avatar swim draft is now **1.18 m** below the water surface. This keeps
  the head, hands and a small part of the torso visible instead of making the
  avatar appear to stand on the water.
- The lake uses the newer depth-aware water shading work. Final waterfall work
  remains disabled until the authored waterfall package described in
  `WATERFALL.md` is available.

### Screenshot gallery

- `P` captures the final postprocessed canvas without the HTML interface.
- The lower-left session gallery supports preview, previous/next lightbox
  navigation, individual PNG download and deletion, plus **Download all** and
  **Delete all** collection actions.
- It retains 12 screenshots; later captures replace the oldest entry and object
  URLs are released when entries leave the collection.

## Recent Grass Lab changes

- Default grass density increased from `2×` to `6×`; the tuning control now
  reaches `10×` for stress testing.
- The lab supports procedural, imported and hybrid blades, deterministic
  16-metre patches, distance LOD, wind and up to eight interaction zones.
- Hybrid mode uses the imported GLB prototype nearby and a two-triangle
  procedural blade at distance. The distant material now has a hybrid-only
  brightness calibration so its patches match the imported near grass more
  closely.

The Grass Lab is available at `/generator/grass-performance.html`; it is not yet
the production grass renderer for the authored Exalted world.
