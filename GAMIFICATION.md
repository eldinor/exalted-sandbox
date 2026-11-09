# Gamification ideas for Exalted

Design proposal, 9 November 2026. These features are not implemented or approved
as a development scope. The aim is to give exploration purpose while preserving
the freedom and atmosphere of the current Sandbox.

## Confirmed boundary: the Cube stays intact

**The Cube serves other purposes and must remain independent of gamification.**

Preserve its placement, appearance, interaction, events, portal reveal and
destination. Do not make it a quest giver, collectible container, progress
display or challenge reward. Do not require fragments, achievements or completed
challenges to use it or enter the portal. Gamification must not intercept its
interaction events or occupy its clearing and approach corridor.

The earlier conversation's “Awaken the Cube” idea is withdrawn. Any exploration
milestone described below belongs to a separate journal or a separately authored
object. It must not modify the Cube, even indirectly.

## What we already have to build on

Exalted has distinctive environments, surfing, limited-duration flight, rocket
jump, nine spells, responsive vegetation, water and named destinations. These
are useful foundations for activities that make movement and observation
interesting without first introducing enemies, combat or an economy.

The recommended player loop is:

1. Notice an interesting place or subtle marker.
2. Explore it and understand a small challenge.
3. Complete the challenge using movement, observation or a spell.
4. Receive clear feedback and a permanent journal entry.
5. Choose another discovery or replay an activity to improve a personal best.

Activities should be optional. Existing movement, spells, avatar colours,
teleport destinations and the Hall portal remain available. Rewards should add
new choices rather than remove features players already enjoy.

## Activity families

| Family | Player experience | Initial implementation direction |
|---|---|---|
| Exploration | Find viewpoints, symbols and small environmental stories | A few authored discovery volumes and journal entries |
| Surfing | Follow a flowing route through a biome | Ordered gates, finish trigger and optional timing |
| Flight | Choose a line through aerial markers | Short courses compatible with existing flight limits |
| Spell puzzles | Understand which spell affects a marked object | Explicit target interaction and visible success state |
| Collections | Find a small, meaningful set of objects | Permanent discoveries with stable IDs |
| Mastery | Improve through practice | Personal bests, optional medals and new cosmetic presets |

### Exploration and the discovery journal

Give each important place an optional discovery: a panorama, weathered marker,
short piece of lore or a small visual detail. The journal can connect the
interactive magazine identity to the world, with brief editorial content where
such content is authored later.

Award a discovery when the avatar reaches its intended area, rather than when
the camera merely sees it. An object requiring observation can offer an
explicit interaction. Avoid rewarding raw time spent standing nearby.

Keep the number of discoveries manageable. Three memorable places are a better
first test than dozens of identical pickups. Each journal entry should name the
place, record what happened and suggest a nearby activity without forcing it.

### Surfing routes

The Long Green is a strong first location because the grass already responds
visibly to movement. Begin with a forgiving, untimed route through several
gates. After the first completion, offer a timed replay and personal best.

Use wide gates and smooth turns. Gate order must be clear, with the next target
readable from the current one. Route design should reward choosing a good line,
not memorising invisible boundaries. Place gates above terrain so grass and
props do not hide their purpose.

The first course can require passing gates while surfing, without demanding
one uninterrupted right-button hold. Stricter “continuous surf” medals can be
an optional later challenge if playtesting supports them.

### Flight routes

Use short aerial legs that fit the existing flight duration, descent behaviour
and cooldown. Provide safe landing areas. A longer journey can contain several
legs with resting points rather than silently extending the flight ability.

Start with generously spaced rings and a clear destination. Later routes could
reward altitude management or a well-timed boost. Test every route with current
flight settings before setting medal times. Do not require a new movement
upgrade to reach existing world locations.

### Spell puzzles

Use visibly authored targets that explain what kind of interaction they accept.
For example, a frost-covered plaque could react to Melt, or a practice target
could respond to Sweep. These are proposed puzzle behaviours, not capabilities
already provided by the current spell system.

Validate that a successful spell affects the intended target; pressing the
correct number key anywhere must not complete the puzzle. A target can change
its own mesh/material state without changing terrain collision or reviving the
removed melted-snow trace. Puzzle state and terrain deformation stay separate.

An unsuccessful attempt should give a useful hint rather than consume a rare
resource or force a long wait. New spell-specific geometry or effect behaviours
should be scoped separately from the basic objective system.

### Collectibles and rewards

Collectibles should encourage a route, viewpoint or observation. Avoid scattering
hundreds of objects uniformly across the map. Each object needs a reason to be
where it is, a readable silhouette and a stable saved identity.

Potential rewards, in increasing implementation cost:

- Journal stamps and named achievement badges.
- Additional authored avatar palette presets, alongside the existing colour UI.
- A new surf or spell colour preset, if support is implemented later.
- A modest reaction on a separate challenge marker or future exploration shrine.

The first prototype can use journal stamps alone. It does not need a currency,
inventory, shop, new particle system or a world monument.

## Suggested activities by area

These are location ideas, not approved placements. Exact routes and grounding
need authoring against the current terrain, props and collisions.

| Area | Candidate activity | Placement considerations |
|---|---|---|
| Desert Start | Short movement introduction and first discovery | Keep it optional and out of the immediate spawn path |
| The Long Green | Beginner surf route | Use broad turns; retain flower colonies and authored vegetation |
| Forest Outlook | Viewpoint discovery and observation clue | Preserve the clearing and its view |
| Accessible Thornwood | Small trail of environmental discoveries | Stay outside the closed dense forest and its collider |
| The Palecrown | Snow discovery or a marked Melt interaction | Preserve the authored snow appearance and existing spell visuals |
| The Ironspine | Later flight course or ridge viewpoint | Check terrain clearance and flight duration; avoid unsafe finish positions |
| Lakeside Overlook / Lake Island | Shore discoveries and a later island route | Respect swimming, water levels and safe landing points |
| Stone Gate | A landmark discovery or short navigation challenge | Keep the road and existing rock structures usable |
| Waterfall area | Reserve for future authored content | Do not depend on the disabled temporary waterfall |

Do not place rewards behind the closed forest barrier. Do not make existing
teleport destinations conditional on progress.

## Recommended first prototype: an Explorer's Journal

Working name only. Build one small optional journey with three independent
entries:

1. **The Long Green:** complete an untimed beginner surf course.
2. **Forest Outlook:** reach a viewpoint discovery, away from the Cube clearing.
3. **The Palecrown:** complete one clearly marked Melt target interaction.

Each entry grants a journal stamp. Three stamps complete a journal page and
display a small completion message. The reward is entirely separate from the
Cube and portal. The activities can be completed in any order.

The spell target is the largest uncertainty in this prototype. If target
interaction needs substantial new rendering or effect work, ship the movement
and discovery activities first, then add the spell objective as the next step.
Do not enlarge the entire first release around one elaborate puzzle.

Test whether players understand and enjoy these activities before adding more
biomes, cosmetic systems or a long chain of quests.

## Player interface and feedback

Use a compact journal button and an expandable activity list. Show the active
objective only when a player chooses to track it or enters an activity. Avoid
adding a permanent large quest panel over the world.

Discoveries need a brief acknowledgement. Active courses need the next gate,
progress and an obvious way to cancel/retry. Timers appear only for timed runs.
After finishing, show the result and personal best without automatically
starting another attempt.

Markers should communicate through shape, text and contrast as well as colour.
Keep decorative motion restrained, and provide a way to hide optional world
markers. Reuse existing input conventions where possible, with journal UI
releasing pointer lock and preventing gameplay input while it is open. The
existing Cube interaction has priority in its own area.

## Progress, attempts and fair completion

Keep three kinds of state distinct:

- Permanent progress: discovered places, collected IDs and completed activities.
- Current attempt: start state, next gate, elapsed time and cancellation reason.
- Records: personal best time, course version and applicable movement rules.

Use active simulation time for timed attempts. Pause must freeze the timer;
loading and a suspended browser tab must not silently produce an unfair record.
Use the same clock for movement and course timing.

Teleporting during a course cancels that attempt with clear feedback. It must
not erase discoveries or completed activities. Free exploration remains free.
If a mode is restricted for a course, show that rule before starting; do not
disable movement abilities globally.

Detect gate crossings along the avatar's movement segment, not just whether one
frame lands inside a tiny volume. This matters for fast surfing and boosts.
Separate permitted course entry from teleports so a position jump cannot count
as traversing several gates. Test low frame rates and sharp turns explicitly.

Start with local browser saving, versioned and namespaced to Exalted. Save on
meaningful progress changes and attempt completion, not every frame. If storage
is unavailable, keep the current session playable. Explain that local progress
does not automatically transfer between browsers, devices or hosted origins.
Do not imply an account or cloud save exists.

## Integration and performance

Prefer a small, data-driven activity subsystem with stable IDs, authored
locations, activity type and completion conditions. Ground markers using the
existing terrain surface queries and chart-to-world conversion.

Keep challenge logic separate from terrain deformation, prop collisions,
rendering and the Cube subsystem. Observe successful spell actions through a
small explicit interface if needed; do not infer gameplay outcomes from particle
meshes or keyboard events.

Update activity state after the final avatar movement state is known. Preserve
the established startup, warm-up, frame, depth, shadow and post-processing order.
Pool/reuse gate geometry and nearby marker resources, use simple distance or
spatial checks, and avoid per-frame allocations and global mesh scans. New
materials must be ready before an activity first becomes visible.

Start with inexpensive non-shadow-casting markers. Additional lighting,
particles and persistent effects require separate visual/performance decisions.
An activity should not make grass or forest streaming more expensive.

Benchmark mode must not award discoveries, start attempts or overwrite personal
records. Compare the same automated camera routes with activities enabled and
disabled; measure CPU, draw calls and frame-time spikes before adding detail.

## Delivery order

| Step | Deliverable | Decision before expanding |
|---|---|---|
| 1 | One discovery and a small journal with local saving | Can a new player find and understand it? |
| 2 | One untimed surf route, retry and reliable gate detection | Is completing it enjoyable with current movement? |
| 3 | Timed replay and personal best | Are timing and cancellation consistent? |
| 4 | One authored spell target and a three-entry journal milestone | Does the puzzle communicate its rules clearly? |
| 5 | Flight course and a small additional cosmetic reward | Do routes fit existing flight limits and performance? |

Do not start with combat, random loot, daily obligations, an XP grind, public
leaderboards or a paid currency. These need additional systems and distract
from testing whether exploring and moving through Exalted is rewarding.

## Validation before release

- Cube and portal placement, interaction, events and navigation are unchanged.
- All existing spells, movement abilities, colour controls and teleports remain
  available outside any explicitly described attempt rules.
- Gate order, finish, retry, cancellation and one-time rewards work without
  granting duplicates. Fast crossings cannot skip detection.
- Pause, teleport, swimming, airborne transitions and course boundaries produce
  defined outcomes. Reload retains permanent progress, not an unintended live run.
- Missing/corrupt local saves fail safely; course revisions do not compare
  incompatible personal-best records.
- Main-app benchmarks cannot affect player progress or records.
- Manual playtesting checks discoverability, readability, route enjoyment and
  performance in both Chrome and Firefox. Automated tests do not replace it.
- Use typecheck and relevant Node tests during implementation. Build for bundle
  validation or deployment when needed; do not use Playwright unless requested.

## Decisions to make before implementation

Confirm the first three activities, exact marker/collectible appearance and
placement, journal presentation and initial reward. Set route lengths and medal
times through playtesting. Decide later whether cross-device saving, public
competition or authored magazine entries are useful enough to justify their
additional scope.

**The Cube remaining intact is a confirmed requirement, not an open decision.**
