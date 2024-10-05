const INSTRUCTIONS = {
    assertN: () => [
      "Stand as though you are in Sydney, with your gaze fixed toward the vast expanse of Tokyo",
      "Imagine you're in Cairo, looking resolutely toward the Arctic Circle",
      "Picture yourself in Buenos Aires, with your attention directed toward the bustling streets of New York"
    ],
    assertW: () => [
      "If you are in Beijing, orient yourself toward the setting sun over the European plains",
      "Stand in India, with your eyes turned toward the distant lands of Africa",
      "Imagine standing in Tokyo, with your gaze reaching toward the shores of Spain"
    ],
    assertS: () => [
      "If you're in Oslo, direct your gaze toward the sands of the Sahara",
      "Imagine yourself in Moscow, looking toward the distant peaks of South Africa",
      "Stand as though you're in London, with your eyes fixed on the tip of Argentina"
    ],
    assertE: () => [
      "Imagine standing in San Francisco, with your gaze traveling toward the bustling streets of New York",
      "If you're in Madrid, turn toward the rising sun over Istanbul",
      "Picture yourself in Rio de Janeiro, with your attention directed to the islands of Singapore"
    ],
    forward: (n) => [
      `Walk as if you're crossing from Los Angeles to New York, but skipping every major city in between for ${n} turns`,
      `Advance like you're traveling from Paris to Moscow, bypassing ${n} stops in between`,
      `Move forward, skipping ${n} landmarks between Sydney and Tokyo as you proceed`
    ],
    right: () => [
      "If you are in Mexico facing the United States, look in the direction of Spain",
      "Imagine you're in Rome, facing Athens, and pivot toward Paris",
      "If standing in Cairo facing the Mediterranean, turn toward the Red Sea"
    ],
    left: () => [
      "If you are in Australia facing Indonesia, turn toward the Pacific and New Zealand",
      "Picture yourself in New York facing Boston, and veer left toward Los Angeles",
      "Stand in London facing Paris, and turn your attention toward Ireland"
    ],
    fullturn: () => [
      "If you're in Tokyo facing Hawaii, reverse your direction to gaze upon South Korea",
      "Imagine standing in Berlin, looking toward London, and turning completely to face Moscow",
      "If you’re in New Delhi facing the Himalayas, spin around to see the Arabian Sea"
    ]
  };  

export default class Solver {
    static bfs(maze, start, goal) {
        let width = maze[0].length;
        let height = maze.length;
        let visited = Array.from({ length: height }, () => Array(width).fill(false));
        let prev = Array.from({ length: height }, () => Array(width).fill(null));
    
        let queue = [];
        queue.push(start);
        visited[start[1]][start[0]] = true;
    
        while (queue.length > 0) {
            let current = queue.shift();
            if (current[0] === goal[0] && current[1] === goal[1]) {
                // Reconstruct path
                let path = [];
                while (current !== null) {
                    path.push(current);
                    current = prev[current[1]][current[0]];
                }
                path.reverse();
                return path;
            }
            let x = current[0];
            let y = current[1];
            // Consider neighbors
            for (let [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                let nx = x + dx;
                let ny = y + dy;
                if (0 <= nx && nx < width && 0 <= ny && ny < height) {
                    if (!visited[ny][nx] && maze[ny][nx] === 0) {
                        visited[ny][nx] = true;
                        prev[ny][nx] = current;
                        queue.push([nx, ny]);
                    }
                }
            }
        }
        return null; // No path found
    }
    
    static generateInstructions(path, initialDirection = 'N') {
        // Define directions
        const directions = ['N', 'E', 'S', 'W'];
        const dirVectors = {
            'N': [0, -1],
            'E': [1, 0],
            'S': [0, 1],
            'W': [-1, 0],
        };
        const leftTurn = { 'N': 'W', 'W': 'S', 'S': 'E', 'E': 'N' };
        const rightTurn = { 'N': 'E', 'E': 'S', 'S': 'W', 'W': 'N' };
    
        let instructions = [];
    
        // Add Assert Facing initialDirection
        instructions.push(INSTRUCTIONS[`assert${initialDirection}`]());
    
        let facing = initialDirection;
        let turnSkips = 0;
    
        for (let i = 1; i < path.length; i++) {
            let [x, y] = path[i - 1];
            let [nx, ny] = path[i];
    
            // Determine movement direction
            let dx = nx - x;
            let dy = ny - y;
    
            let moveDir = null;
            for (let dir in dirVectors) {
                let [vdx, vdy] = dirVectors[dir];
                if (vdx === dx && vdy === dy) {
                    moveDir = dir;
                    break;
                }
            }
    
            if (moveDir === null) {
                throw new Error(`Invalid movement from (${x}, ${y}) to (${nx}, ${ny})`);
            }
    
            if (moveDir === facing) {
                // Continue moving forward
                continue;
            } else {
                // We need to make a turn
                // First, issue the forward instruction with turn skips
                instructions.push(INSTRUCTIONS.forward(turnSkips));
                turnSkips = 0;
    
                // Determine the turn
                let facingIndex = directions.indexOf(facing);
                let moveIndex = directions.indexOf(moveDir);
                let delta = (moveIndex - facingIndex + 4) % 4;
    
                if (delta === 1) {
                    instructions.push(INSTRUCTIONS.right());
                    facing = rightTurn[facing];
                } else if (delta === 3) {
                    instructions.push(INSTRUCTIONS.left());
                    facing = leftTurn[facing];
                } else if (delta === 2) {
                    // Need to turn around
                    facing = rightTurn[facing];
                    instructions.push(INSTRUCTIONS.fullturn());
                    facing = rightTurn[facing];
                }
    
                // Now, start moving forward, skipping turns as needed
            }
    
            // Since we've made a turn, start counting skipped turns
            turnSkips += 1;
        }
    
        // After loop, if we've moved, add final forward instruction
        instructions.push(INSTRUCTIONS.forward(turnSkips));
    
        return instructions;
    }

    static findSolution(maze, start, goal, seed, initialDirection = 'N') {
        const random = (seed=>{
            let s = seed;
            return function() {
                s = Math.sin(s) * 10000;
                return s - Math.floor(s);
            };
        })(seed);

        let path = this.bfs(maze, start, goal);
        if (path === null) {
            return null; // No path found
        }
        let instructions = this.generateInstructions(path, initialDirection);
        let cnt = 0;
        let block = [];
        let blocks = [];
        instructions.forEach(opts =>{
            const idx = Math.floor(opts.length * random());
            block.push(opts[Math.max(idx, opts.length - 1)]);
            if(block.length > 1 && random() < 0.3){
                blocks.push(block.join(', '));
                block = [];
            }
        });
        return blocks;
    }
}