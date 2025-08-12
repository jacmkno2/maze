# 3D Labyrinth Explorer

3D Labyrinth Explorer is a browser-based experiment that mixes procedural maze generation with search‑engine‑friendly text content. Every level is encoded in the URL (hash or path) so a shared link always recreates the same labyrinth.

## How it works
- **Deterministic levels** – The game decodes the hash or path portion of the URL into a pair of numbers `[level, variant]`. Those numbers seed the generator so each level can be reproduced and linked directly.
- **Objective** – Start next to a glowing red orb and navigate through the maze to touch the green exit orb(s). Reaching the exit loads the next level automatically.
- **Guidance** – A compass on the HUD always points toward the nearest exit.
- **Generated instructions** – For each maze the solver produces a path and converts it into geography‑themed sentences ("Imagine standing in Rome, facing Athens, and pivot toward Paris..."). These instructions populate the page to make every level text‑rich for SEO purposes. The geography theme senteces are programatically generated to represent the optimal path to solve the game.
- **Technology** – Three.js renders the scene while Cannon.js handles basic physics and collisions. Pointer‑lock controls provide a first‑person experience.


## Current issues
- Maze traversal offers little variety beyond finding the exit.
- SEO text and gameplay feel only loosely connected.

## Ideas for improvement
- Add obstacles, collectibles, timed runs or narrative events so each level feels meaningful.
- Include optional side objectives (keys, switches, hidden rooms) that tie into the generated text.
- Provide mobile and gamepad input.
- Currently the walls are plain cubes which generates more geometries than would be necesary if we used some algorithm to make larger whole walls.

### SEO & Architecture
- Replace the current geography metaphors with richer stories or educational snippets that relate to the actual maze layout, but this should be implemented after we have some actual gamplay mechanics that we can use as leverage to describe each world in a unique way.
- Explore server‑side rendering to deliver unique pages, implement soft‑404 limits and `noindex` rules after a certain depth.

### Monetization & Community
- Offer a premium tier to remove ads or unlock special maze sets.
- Track progress and leaderboards to encourage return visits.
- Consider a level editor or user‑generated maze sharing.

## Next steps
1. Prototype new mechanics (traps, collectibles, narrative clues).
2. Experiment with richer SEO text tied directly to gameplay.
3. Add mobile and controller support.
4. Plan analytics and monetization strategies.

## Running locally
Open `index.html` in a modern browser. Use **WASD** or arrow keys to move, **Shift** to run, **Space** to jump and move the mouse to look around. The URL (hash or path) encodes the current level—share the link to let others play the same maze.

