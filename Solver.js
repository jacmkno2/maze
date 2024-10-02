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
        instructions.push(`Assert Facing ${initialDirection}`);
    
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
                instructions.push(`Forward skipping ${turnSkips}`);
                turnSkips = 0;
    
                // Determine the turn
                let facingIndex = directions.indexOf(facing);
                let moveIndex = directions.indexOf(moveDir);
                let delta = (moveIndex - facingIndex + 4) % 4;
    
                if (delta === 1) {
                    instructions.push('Turn right');
                    facing = rightTurn[facing];
                } else if (delta === 3) {
                    instructions.push('Turn left');
                    facing = leftTurn[facing];
                } else if (delta === 2) {
                    // Need to turn around
                    instructions.push('Turn right');
                    facing = rightTurn[facing];
                    instructions.push('Turn right');
                    facing = rightTurn[facing];
                }
    
                // Now, start moving forward, skipping turns as needed
            }
    
            // Since we've made a turn, start counting skipped turns
            turnSkips += 1;
        }
    
        // After loop, if we've moved, add final forward instruction
        instructions.push(`Forward skipping ${turnSkips}`);
    
        return instructions;
    }

    static findSolution(maze, start, goal, initialDirection = 'N') {
        let path = this.bfs(maze, start, goal);
        if (path === null) {
            return null; // No path found
        }
        let instructions = this.generateInstructions(path, initialDirection);
        return instructions;
    }
}