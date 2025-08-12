# 3D Labyrinth Explorer

3D Labyrinth Explorer is a browser-based experiment that mixes procedural maze generation with search‑engine‑friendly text content. Every level is encoded in the URL hash so a shared link always recreates the same labyrinth.

## How it works
- **Deterministic levels** – The game decodes the hash portion of the URL into a pair of numbers `[level, variant]`. Those numbers seed the generator so each level can be reproduced and linked directly.
- **Objective** – Start next to a glowing red orb and navigate through the maze to touch the green exit orb(s). Reaching the exit loads the next level automatically.
- **Generated instructions** – For each maze the solver produces a path and converts it into geography‑themed sentences ("Imagine standing in Rome, facing Athens, and pivot toward Paris..."). These instructions populate the page to make every level text‑rich for SEO purposes.
- **Technology** – Three.js renders the scene while Cannon.js handles basic physics and collisions. Pointer‑lock controls provide a first‑person experience.

## Current issues
- Players can occasionally jump over walls, skipping the challenge.
- Maze traversal offers little variety beyond finding the exit.
- SEO text and gameplay feel only loosely connected.

## Ideas for improvement
### Gameplay & Content
- Increase wall height or limit jump strength to prevent bypassing walls.
- Add obstacles, collectibles, timed runs or narrative events so each level feels meaningful.
- Include optional side objectives (keys, switches, hidden rooms) that tie into the generated text.
- Provide mobile and gamepad input.

### SEO & Architecture
- Replace the current geography metaphors with richer stories or educational snippets that relate to the actual maze layout.
- Encapsulate URL generation in a single helper so switching from hash‑based levels to real server paths is a one‑line configuration change.
- Explore server‑side rendering to deliver unique pages, implement soft‑404 limits and `noindex` rules after a certain depth.

### Monetization & Community
- Offer a premium tier to remove ads or unlock special maze sets.
- Track progress and leaderboards to encourage return visits.
- Consider a level editor or user‑generated maze sharing.

## Next steps
1. Fix the wall‑jumping exploit.
2. Abstract level URLs into a central configuration.
3. Prototype new mechanics (traps, collectibles, narrative clues).
4. Experiment with richer SEO text tied directly to gameplay.
5. Add mobile and controller support.
6. Plan analytics and monetization strategies.

## Running locally
Open `index.html` in a modern browser. Use **WASD** or arrow keys to move, **Shift** to run, **Space** to jump and move the mouse to look around. The hash in the URL encodes the current level—share the link to let others play the same maze.

