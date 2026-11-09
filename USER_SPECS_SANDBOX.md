# Exalted Sandbox: user requirements

Version 1, 9 November 2026.

This document describes the experience users should have in the main Exalted
Sandbox. It consolidates established product decisions and separately identifies
future gamification proposals. It does not authorise implementation of every
proposal or claim that every acceptance check has been performed.

Implementation details belong in [ARCHITECTURE.md](ARCHITECTURE.md) and the
subsystem documents. Gamification design options are expanded in
[GAMIFICATION.md](GAMIFICATION.md).

## 1. Product purpose and audience

Exalted Sandbox is a browser-based, interactive 3D world where visitors explore
distinct environments, control an avatar, surf, fly, experiment with spells and
visit the Hall through the existing portal. It is part of the Exalted
interactive 3D magazine experience.

The primary audience is desktop visitors using a keyboard and mouse. Creators
also need tools to inspect the world, adjust presentation and compare performance.
Creator tools must not dominate the visitor interface.

The experience should encourage curiosity and expressive movement. Visitors
must be able to explore without completing a quest, earning currency or creating
a gameplay account. Future activities should add optional purpose to exploration.

## 2. Requirement status

| Status | Meaning |
|---|---|
| Established | A product requirement based on existing behaviour or an accepted user direction; preserve and validate it |
| Protected | An explicit constraint that future changes must respect |
| Proposed | A future option requiring scope and design agreement before implementation |

An established requirement is not a declaration that the feature is defect-free.
The acceptance conditions below describe what should be checked.

## 3. Entry, loading and compatibility

| ID | Requirement | Status | Acceptance condition |
|---|---|---|---|
| ENT-01 | Open the main Sandbox directly in a supported desktop browser | Established | The published root URL opens the playable world without developer commands |
| ENT-02 | Show Exalted branding while loading | Established | Loading presents the logo, “Interactive 3D magazine” and a distinct “Sandbox” line; the page title identifies Exalted Sandbox |
| ENT-03 | Keep the loading screen visible until required resources and rendering preparation are ready | Established | The player is not placed into a partially initialised world; normal first movement does not trigger avoidable preparation stalls |
| ENT-04 | Explain startup failures clearly | Established | Unsupported graphics capability and failed asset downloads produce appropriate messages; download failures identify the resource rather than always blaming browser support |
| ENT-05 | Support the intended controls in Chrome and Firefox on compatible WebGPU systems | Established | Mouse look, right-button surfing and mouse steering work in both browsers without requiring special Firefox settings |
| ENT-06 | Preserve the current WebGPU-only product scope | Protected | No WebGL fallback, mobile-control promise or broader device guarantee is implied without separate agreement |

## 4. World and exploration

| ID | Requirement | Status | Acceptance condition |
|---|---|---|---|
| WRL-01 | Explore the authored Exalted world and its distinct biomes | Established | Desert, beach, grassland, forest, snow, mountains and lake/island areas retain their intended identity and layout |
| WRL-02 | Keep named destinations easy to reach | Established | The top location bar includes Desert Start, The Palecrown, The Long Green, The Thornwood, Forest Outlook, The Ironspine, Lakeside Overlook, Lake Island, Waterfall and Stone Gate |
| WRL-03 | Preserve unrestricted use of existing teleport destinations | Protected | New optional progress systems do not lock or remove current destinations |
| WRL-04 | Place the avatar and props consistently on the visible terrain | Established | The avatar does not routinely fall through terrain; trees and rocks are grounded; intended solid trunks and cacti block walking |
| WRL-05 | Preserve authored forest access boundaries and clearings | Protected | The closed dense forest remains inaccessible as designed; Forest Outlook and the Cube approach remain usable |
| WRL-06 | Keep water and shore boundaries visually continuous | Established | Lake and island shores have no visible holes between water and land; beach and biome transitions blend naturally |
| WRL-07 | Preserve readable roads and mountain surfaces | Established | Roads remain visible where authored; terrain texture changes do not erase them or introduce obvious cliff stretching and seams |
| WRL-08 | Keep environment lighting usable for exploration | Established | Forest, lake and mountain areas remain readable; biome-dependent sun movement does not produce black shadow blinking |
| WRL-09 | Keep incomplete authored features distinct from finished content | Protected | The Waterfall destination does not imply that the final waterfall package is integrated; temporary disabled content is not restored implicitly |

## 5. Avatar, movement and interaction

| ID | Requirement | Status | Acceptance condition |
|---|---|---|---|
| MOV-01 | Walk, sprint, look around and adjust camera distance | Established | Keyboard movement and mouse camera controls respond predictably; the player can release the mouse to use UI |
| MOV-02 | Surf while holding the right mouse button | Established | Surf starts and stops reliably; mouse movement steers as intended in supported browsers |
| MOV-03 | Fly, rise, descend and use the existing boost | Established | Flight follows the current limits and shows useful flight/cooldown feedback |
| MOV-04 | Respect existing flight duration and cooldown | Protected | The current player contract is up to 15 seconds of flight and a 5-second cooldown after landing; new activities fit these limits unless a change is explicitly approved |
| MOV-05 | Respond appropriately to water | Established | Swimming and transitions between land, water and flight do not incorrectly apply ground-only interaction effects |
| MOV-06 | Make movement feel connected to the environment | Established | Grass bends during walking and parts during surfing; vegetation interactions release naturally when the avatar leaves |
| MOV-07 | Match surf feedback to the biome | Established | Snow, desert, grass and forest have suitable wake/particle appearance; vegetation effects are visible without obscuring play |
| MOV-08 | Allow avatar colour customisation | Established | Visitors can use the existing colour controls; future rewards do not take those controls away |

### Current control reference

| Action | Control |
|---|---|
| Move | WASD or arrow keys |
| Look | Mouse; click the world to take camera control |
| Release mouse / access menus | Esc |
| Change camera distance | Mouse wheel |
| Sprint | Shift |
| Surf | Hold right mouse button |
| Start flight / rise | Space / hold Space |
| Descend while flying | Ctrl |
| Rocket jump / flight boost | F |
| Existing Cube interaction | E when prompted |

Help must stay consistent with implemented controls if they change later.

## 6. Spells

SP-01 — Visitors can aim with the camera and experiment with the nine existing
spells using number keys. Spell feedback must remain readable and appropriate
to the affected surface. This is established behaviour.

| Key | Spell | User-facing action |
|---|---|---|
| 1 | Sweep | Send a crescent wave across the ground |
| 2 | Ribbon | Hold to guide a flowing ribbon |
| 3 | Bloom | Create an upward burst at the aimed spot |
| 4 | Crystallize | Grow a crystal formation |
| 5 | Vortex | Raise a swirling vortex |
| 6 | Rift | Split a path ahead |
| 7 | Aegis | Hold to grow a wall; press again to shatter it |
| 8 | Avalanche | Launch a rolling wave forward |
| 9 | Melt | Thaw the surface at the aimed spot |

SP-02 — Preserve the removal of the obsolete visible melted-snow trace. New
spell puzzles must not restore that trace as an incidental effect. Protected.

SP-03 — Existing spells remain available for free experimentation. A proposed
quest or reward must not retroactively lock them. Protected.

## 7. Cube and Hall portal

**The Cube is reserved for other purposes and must stay intact.**

| ID | Requirement | Status | Acceptance condition |
|---|---|---|---|
| CUB-01 | Preserve the existing Cube at Forest Cube Spawn | Protected | Placement, appearance, interaction and event handling are retained |
| CUB-02 | Preserve the existing portal reveal and entry flow | Protected | The player can interact with the Cube as before and enter the revealed portal |
| CUB-03 | Open the Hall in the same browser window | Established | Portal entry navigates to `https://eldinor.github.io/hall/` |
| CUB-04 | Keep the Cube independent of gamification | Protected | No collectible, quest, journal, score or achievement requirement controls Cube or portal access |
| CUB-05 | Preserve the Cube clearing and interaction priority | Protected | New activity markers do not block its approach, reuse its prompt or intercept its events |

The former “Awaken the Cube” suggestion is withdrawn. It is not a requirement.

## 8. Interface, help and presentation

| ID | Requirement | Status | Acceptance condition |
|---|---|---|---|
| UI-01 | Keep navigation and essential controls discoverable | Established | The top bar and flight feedback are readable without covering excessive world space |
| UI-02 | Provide controls and spell help from a question-mark button | Established | The upper-right button opens current help; keyboard focus and closing work; gameplay input is blocked while the help dialog is active |
| UI-03 | Use the logo in the top panel and the crown favicon | Established | Branding remains appropriately sized and the top logo links to `https://alpha.exalted8.com/` |
| UI-04 | Hide development panels from the normal visitor view | Established | Benchmark, Texture and Wind panels do not appear as default visitor UI; their underlying tools can remain available for development |
| UI-05 | Avoid relying on colour alone for new gameplay instructions | Proposed | Future gates, objectives and completion states also use shape, text or clear positional cues |
| UI-06 | Keep future activity UI compact and optional | Proposed | Journal and active-objective displays can be closed or untracked; free exploration remains uncluttered |

## 9. Optional gamification: proposed requirements

The following are candidates, not an approved implementation backlog. Their
priority, exact placement, appearance and rewards still need agreement. All
protected requirements above apply if these features are implemented.

| ID | Proposed user need | Acceptance condition if implemented |
|---|---|---|
| GAM-01 | Discover meaningful places and record them in a journal | Reaching or explicitly inspecting a discovery records it once and explains what was found |
| GAM-02 | Choose short surfing activities | A route has a readable start, ordered gates, finish and retry/cancel flow |
| GAM-03 | Improve through optional timed replays | The result shows a personal best; first completion need not require a strict time target |
| GAM-04 | Try flight courses suited to current movement | A course is achievable with existing flight limits and has suitable landing areas |
| GAM-05 | Solve clear spell-target interactions | A successful spell affects the intended target; a keypress alone does not grant completion |
| GAM-06 | Collect a small number of purposeful discoveries | Objects reward exploration or observation; progress is not based on repetitive mass collection |
| GAM-07 | Receive additional cosmetic or journal rewards | Rewards add choices while preserving existing controls, abilities and portal access |
| GAM-08 | Retain permanent progress between visits | Versioned local saving restores discoveries and completions; unavailable storage does not prevent playing |
| GAM-09 | Understand what is saved and where | UI does not imply cloud or cross-device saving; progress on different browsers or hosted origins is not presented as shared |
| GAM-10 | Retry without losing completed discoveries | Restarting or cancelling an attempt affects that attempt, not permanent journal progress |
| GAM-11 | Have fair course timing | Pausing freezes time; teleporting cancels a live course; fast movement cannot skip gate detection |
| GAM-12 | Complete a small optional journey independently of the Cube | A journal milestone provides its own acknowledgement with no Cube or portal changes |

The suggested initial journey is a beginner surf route at The Long Green,
a Forest Outlook discovery and, after target-interaction feasibility is checked,
a marked Melt activity at The Palecrown. These remain design suggestions.

Public leaderboards, combat, random loot, currencies, paid rewards, mandatory
daily tasks and gameplay accounts are outside the proposed first prototype.

## 10. Quality and performance

| ID | Requirement | Status | Acceptance condition |
|---|---|---|---|
| QLT-01 | Keep movement responsive and rendering stable | Established | Representative exploration, surfing and flight are checked for stalls, input failures and visible rendering faults |
| QLT-02 | Preserve visual coherence when optimising assets | Established | Materials, foliage cutouts and distant forest appearance are reviewed after compression or LOD changes |
| QLT-03 | Reduce downloads without degrading authored map data | Protected | Main-app PNG surface textures use the accepted WebP quality-80 derivatives; numeric heightmaps, biome/coverage masks and rock displacement remain unchanged PNGs |
| QLT-04 | Keep performance tools available to creators | Established | Repeatable camera benchmarks and grass comparisons remain usable for development while hidden from visitors |
| QLT-05 | Prevent diagnostics from altering future progress | Proposed | Benchmarks cannot award journal entries, complete activities or overwrite player records |
| QLT-06 | Verify changes on the intended browsers | Established | Chrome and Firefox receive manual input/visual checks where relevant; automated tests alone do not imply visual approval |

No universal FPS target, supported GPU list or maximum loading time has been
agreed. Define measurable targets against named hardware, resolution and browser
before treating numerical performance promises as release requirements.

## 11. Creator inspection needs

These support authoring and quality checks; they are not mandatory visitor tasks.

| ID | Requirement | Status | Acceptance condition |
|---|---|---|---|
| DEV-01 | Capture the current view and whole-world inspection images | Established | Existing screenshot controls provide a normal capture, a top-down whole-map view and an orthographic view including trees/props |
| DEV-02 | Inspect terrain maps independently | Established | The heightmap lab remains available for map upload and opacity comparisons without redefining production-world behaviour |
| DEV-03 | Compare expensive subsystems consistently | Established | Automated benchmark routes allow comparable measurements, including tests with grass disabled |
| DEV-04 | Preserve authored source assets during optimisation | Protected | Derivative compression does not overwrite original PNGs or GLBs; deployments include selected runtime assets rather than all source packs |

Standalone labs, procedural previews and editors are supporting utilities.
They must not silently change the visitor world's authored layout or rules.

## 12. Release acceptance and unresolved decisions

Before publishing a change, check the applicable requirements above, verify the
package contains its required assets, and distinguish automated validation from
manual visual/browser checks. The Cube/portal contract must be rechecked for any
new activity or interaction system near the forest clearing.

Open decisions include:

- Which optional activities form the first playable prototype.
- Journal design, marker appearance, exact locations and new reward choices.
- Course lengths and medal thresholds, determined through playtesting.
- Any mobile/touch support, cloud saves, accounts or public competition.
- Hardware-specific performance and loading targets.

Changes to these decisions should update this document and GAMIFICATION.md.
The protected Cube requirement does not depend on any of those decisions.
