// Utilities specific for grid logic


/**
 * Calculates the area of the grid that is enclosed by true values 
 * Uses BFS as the core algorithm
 * @param {*} grid array of arrays with boolean values
 * @returns Area of the grid that is enclosed by true values
 */
function areaCalc(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    let visited = create2dArray(rows, cols, false);

    // Add all edge points to the queue that are false
    let queue = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (i === 0 || i === rows - 1 || j === 0 || j === cols - 1 && grid[i][j] === false) {
                queue.push([i, j]);
            }
        }
    }

    let area = 0;
    // BFS Approach for finding outer enclosing area
    while (queue.length > 0) {
        let [row, col] = queue.shift();
        if (visited[row][col] || grid[row][col] === true) {
            continue;
        } else {
            // Everything in queue contributes to area and was visited
            visited[row][col] = true;
            area++;
            let directions = [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
            ];

            for (let [rowInc, colInc] of directions) {
                let newRow = row + rowInc;
                let newCol = col + colInc;

                // Any false unvisited node can be added to the queue
                if (
                    newRow >= 0 &&
                    newRow < rows &&
                    newCol >= 0 &&
                    newCol < cols &&
                    !visited[newRow][newCol] &&
                    grid[newRow][newCol] === false
                ) {
                    queue.push([newRow, newCol]);
                }
            }
        }
    }

    // Obtain inner area by subtracting outer area from total area
    return rows * cols - area;
}


/**
 * Helper to determine which corners are free to add rounding.
 * For example, if top, left, and top-left are not the same as val, top-left corner can be rounded.
 * @param {*} grid 
 * @param {*} row row of el
 * @param {*} col col of el
 * @param {*} rows total rows
 * @param {*} cols total cols
 * @param {*} val value to check for adjacent tiles
 * @returns 
 */
function getFreeCorners(grid, row, col, rows, cols, val) {

    let directions = [
        [0, -1], // left
        [0, 1], // right
        [-1, 0], // up 
        [1, 0], // down
        [-1, -1], // top-left
        [-1, 1], // top-right
        [1, -1], // bottom-left
        [1, 1], // bottom-right
    ];

    // If respective direction is open (not val and in grid bounds)
    let openDirections = [false, false, false, false, false, false, false, false];
    for (let i = 0; i < directions.length; i++) {
        let [rowInc, colInc] = directions[i];
        let newRow = row + rowInc;
        let newCol = col + colInc;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && grid[newRow][newCol] !== val) {
            openDirections[i] = true;
        }
    }

    let openCorners = [
        false, // top-left
        false, // top-right
        false, // bottom-right
        false // bottom-left
    ];
    // Top-left corner
    if (openDirections[0] && openDirections[2] && openDirections[4]) {
        openCorners[0] = true;
    }
    // Top-right corner
    if (openDirections[1] && openDirections[2] && openDirections[5]) {
        openCorners[1] = true;
    }
    if (openDirections[1] && openDirections[3] && openDirections[7]) {
        openCorners[2] = true;
    }
    if (openDirections[0] && openDirections[3] && openDirections[6]) {
        openCorners[3] = true;
    }

    return openCorners;

}


/**
 * Performs a depth-first search traversal on a grid to find a path from start to end
 * @param {*} grid 2D array to perform DFS on
 * @param {*} startPoint [row, col] starting point for DFS
 * @param {*} endPoint  [row, col] ending point for DFS
 * @param {*} obstacleSet JS Set object containing untraversable values for DFS on grid
 * @param {*} isWeighted Whether to weight DFS traversal closer towards end point
 * @returns DFS Traversal path
 */
function dfsTraversal(
    grid,
    startPoint,
    endPoint,
    obstacleSet = new Set([1]),
    isWeighted = true,
) {
    const rows = grid.length;
    const cols = grid[0].length;

    // Keep track of visited nodes
    let visited = create2dArray(rows, cols, false);
    // track path for DFS traversal
    let path = [];

    // Helper function to perform DFS traversal, returns true if end point is found and adds current node to path, false otherwise
    function dfsHelper(row, col) {
        // Base case, found endpoint so true can be returned
        if (endPoint[0] === row && endPoint[1] === col) {
            path.push([row, col]);
            return true;
        }

        // Traverse in 4 cardinal directions
        let directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ];
        // Randomize directions for variability in grid-based DFS
        shuffleArray(directions);

        // Prioritize directions that are closer to the end point by weighting them with manhattan distance if isWeighted is true
        let weightedDirections = directions.map((dir) => {
            let newRow = row + dir[0];
            let newCol = col + dir[1];

            // Give invalid paths infinite weight
            if (
                newRow < 0 ||
                newRow >= rows ||
                newCol < 0 ||
                newCol >= cols ||
                obstacleSet.has(grid[newRow][newCol])
            ) {
                return [dir, Infinity];
            }
            return [dir, manhattanDistance([newRow, newCol], endPoint)];
        });

        // Filter out invalid paths
        weightedDirections = weightedDirections.filter((el) => el[1] !== Infinity);
        // Sort ascending distance
        weightedDirections = weightedDirections.sort((a, b) => a[1] - b[1]);
        // Get rid of distance from weighted directions
        weightedDirections = weightedDirections.map((dir) => dir[0]);
        // Use weighted directions if isWeighted is true and probability check passes, otherwise use randomized directions
        if (isWeighted && random() > 0.80) {
            directions = weightedDirections;
        }

        // Mark current node as visited
        visited[row][col] = true;

        // Basic DFS loop, adding path if end is found for item
        for (let [rowInc, colInc] of directions) {
            let newRow = row + rowInc;
            let newCol = col + colInc;
            if (
                newRow >= 0 &&
                newRow < rows &&
                newCol >= 0 &&
                newCol < cols &&
                !visited[newRow][newCol] &&
                !obstacleSet.has(grid[newRow][newCol])
            ) {
                // Recursively call DFS helper
                // if true is returned then path is found and current node can be added to path
                if (dfsHelper(newRow, newCol)) {
                    path.push([row, col]);
                    return true;
                }
            }
        }

        // Path not found, return false
        return false;
    }

    // Call DFS helper function to perform DFS traversal and return reversed path
    dfsHelper(startPoint[0], startPoint[1]);
    return path.reverse();
}
