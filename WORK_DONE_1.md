# Exalted — work completed

**Period: 28 September–12 October 2026**  
Brief notes for non-technical readers, covering the main application and its supporting tools.

## World and landscape

- Moved the main world to the updated heightmap, making landscape corrections easier to apply. Integrated the revised terrain and biome maps.
- Reduced the map's width and length by half while keeping the character and objects at their original physical size.
- Improved the transitions between grass, forest, desert, rock and roads. Added forest ground, asphalt roads, northern rocky areas and sandy shores.
- Reduced visible texture repetition on rock and beach surfaces.
- Raised the lake water level and closed gaps along the lake and island shores. Added sand to the island shoreline.

## Grass and flowers

- Populated the grass biome with moving grass that reacts to walking and parts to either side during surfing.
- Adjusted density and viewing distance, removed tall grass and grass shadow casting, and reduced work on grass outside the camera's view.
- Improved preparation during loading to reduce the first stutter when approaching grass.
- Added scattered dandelion and daisy colonies, with varied models and the same movement reactions as grass.

## Forest and desert vegetation

- Built the forest according to the corrected concept: a dense border section and a more open woodland extending toward Forest Outlook.
- Kept clearings and access around Forest Outlook and Forest Cube Spawn. Added smaller trees and bushes along the restricted forest boundary.
- Selected and prepared pine, fir and spruce assets. Corrected floating trees and made foliage colours more consistent.
- Used lightweight tree images for distant forest coverage, including aerial views, and halved the number of real large trees.
- Reduced desert crowding, improved tree/cactus collisions and made vegetation load and render by area.

## Lighting and surfing effects

- Added gradual changes in sun direction for the forest and Lake Island. Adjusted lighting updates to reduce blinking during these transitions.
- Set the current sun elevation to 30 degrees.
- Added green grass surfing effects and brown forest grass particles. Improved particle size, upward motion and falling behaviour.
- Removed the unwanted old melted-snow trace from the Melt spell.

## Cube and Portal

- Restored the interactive Cube at Forest Cube Spawn, without the Reflection Cube.
- Pressing **E** nearby dissolves the Cube and reveals the animated portal. Entering it shows a message and sends an entry notification for game actions.

## Tools and checks

- Added map uploads and adjustable heightmap/biome-map visibility to the terrain preview.
- Added avatar colour controls and repaired the Inspector shortcut.
- Added a compact performance panel with repeatable camera routes for grassland and forest, plus vegetation toggles for comparisons.
- Added whole-map overhead screenshots: **Ctrl+P** for terrain/water and **Ctrl+Shift+P** for the map with forest and desert objects.
- Created grass, forest and spruce preview tools with model-mix controls and performance recording. Recorded biome-map requirements and asset findings in project notes.
- Ran automated checks and browser checks throughout the work. The latest complete automated suite passed **174 checks**.
