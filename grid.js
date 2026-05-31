class Grid {

    /**
     * Grid constructor
     * @param {*} rows Total rows in the grid
     * @param {*} cols Total cols in the grid
     * @param {*} startPoint [row, col] starting point for road
     * @param {*} endPoint [row, col] ending point for road
     * @param {*} pathBuffer buffer to draw desire path on
     * @param {*} blurBuffer buffer to draw blurred elements on for glow effect
     */
    constructor(rows, cols, startPoint, endPoint, pathBuffer, blurBuffer) {
        this.rows = rows;
        this.cols = cols;
        this.startPoint = startPoint;
        this.endPoint = endPoint;

        // Grid encoding data structure
        this.grid = create2dArray(this.rows, this.cols, 0);


        this.bfsPath = [];
        this.desirePaths = [];
        this.desirePathBounds = [];


        // Buffers for each graphical element
        this.buildingBuffer = createGraphics(width, height);
        this.fenceBuffer = createGraphics(width, height)
        this.blurBuffer = blurBuffer;
        this.roadBuffer = createGraphics(width, height);
        this.pathBuffer = pathBuffer; // Shared buffer for path since boids need to draw on it dynamically


        // TODO: Use enums for grid values if change in language
        this.grid[this.startPoint[0]][this.startPoint[1]] = 3; // Mark start point
        this.grid[this.endPoint[0]][this.endPoint[1]] = 4; // Mark end point

        // Randomly decide which building cells have strokes for variance
        this.buildingStrokes = create2dArray(this.rows, this.cols, false);
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (random() > 0.5) {
                    this.buildingStrokes[i][j] = true;
                }
            }
        }

    }

    /**
     * Handles all grid population including road generation, building and fence placement, and desire path generation
     */
    addRoad() {

        // Create temporary grid with pseudo obstacles for road generation to create more interesting roads
        let obstacleGrid = ObstacleWrapper.pseudoObstaclePopulate(this.rows, this.cols, this.startPoint, this.endPoint);

        // Use area ratio of gap between generated paths to suboptimal path length 
        // to ensure paths are sufficiently different
        let ratio = -Infinity;

        // Candidate grids and paths 
        let candidateGrid = create2dArray(this.rows, this.cols, 0);
        let candidateRefinedPath = [];
        let candidateDesirePaths = [];
        let candidateDesirePathBounds = []


        // Keep generating paths until ratio of area between suboptimal path and desire path is reached
        // Ensures boids take more interesting paths with desire paths that deviate more from the suboptimal path
        let attempts = 0;
        let removedObstacles = false;
        while (ratio < 1.6) {
            // Pseudo obstacles can lead to unsolvable grids in some cases where endpoints are close
            if (attempts > 20) {
                obstacleGrid = create2dArray(this.rows, this.cols, 0);
                removedObstacles = true;
            }
            attempts++;

            // Generate candidate DFS-based path on obstacle grid
            let candidatePath = dfsTraversal(
                obstacleGrid,
                this.startPoint,
                this.endPoint,
                new Set([BUILDING_VALUE]),
                true,
            );

            // Refine candidate path with BFS to get clean suboptimal path 
            let dfsGrid = create2dArray(this.rows, this.cols, 0);
            for (let [row, col] of candidatePath) {
                dfsGrid[row][col] = 1;
            }
            candidateRefinedPath = this.refineRoadBFS(dfsGrid)

            // Populate candidate grid with suboptimal road, buildings, and fences for desire path generation
            candidateGrid = create2dArray(this.rows, this.cols, 0);
            for (let [row, col] of candidateRefinedPath) {
                candidateGrid[row][col] = 6;
            }
            // Mark start and end points on candidate grid for pathfinding
            candidateGrid[this.startPoint[0]][this.startPoint[1]] = 3;
            candidateGrid[this.endPoint[0]][this.endPoint[1]] = 4;
            ObstacleWrapper.procedurallyPlaceBuildings(candidateGrid, 0.05, 3, 3);
            ObstacleWrapper.procedurallyPlaceFences(candidateGrid, 0.04, 3);

            // Generate desire paths on candidate grid
            [candidateDesirePaths, candidateDesirePathBounds] = this.generateDesirePaths(candidateGrid, candidateRefinedPath, 5);

            if (DEEP_DEBUG) {
                console.log("Candidate path: ", candidatePath)
                console.log("Candidate grid: ", candidateGrid)
                console.log("Candidate refined path: ", candidateRefinedPath)
                console.log("Candidate desire paths: ", candidateDesirePaths)
            }

            // Calculate area between suboptimal path and desire paths and ratio of area to suboptimal path length 
            const refinedLength = candidateRefinedPath.length;
            const areaDiff = this.getArea(candidateRefinedPath, candidateDesirePaths);
            ratio = areaDiff / refinedLength;
            console.log(`Ratio: ${ratio}, Area Diff: ${areaDiff}, Refined Length: ${refinedLength}`)


        }

        // If ratio is sufficient, set grid, bfsPath, desirePaths, and desirePathBounds to candidate values 
        this.grid = candidateGrid;
        this.bfsPath = candidateRefinedPath;
        this.desirePaths = candidateDesirePaths;
        this.desirePathBounds = candidateDesirePathBounds;
        console.log("FINAL GRID:", this.grid)
        console.log("BFS Path: ", this.bfsPath)
        console.log("Desire paths: ", this.desirePaths)
        console.log("Desire path bounds: ", this.desirePathBounds)

        // Mark start and end points as roads for drawing 
        this.grid[this.startPoint[0]][this.startPoint[1]] = 6;
        this.grid[this.endPoint[0]][this.endPoint[1]] = 6;

    }

    /**
     * Uses grid with dirty DFS path to generate a clean suboptimal path with BFS
     * @param {*} grid path with DFS traversal marked
     * @param {*} startPoint 
     * @param {*} endPoint 
     * @returns BFS refined path from start to end on grid, acting as main road for grid 
     */
    refineRoadBFS(grid, startPoint = this.startPoint, endPoint = this.endPoint) {
        let queue = [[startPoint[0], startPoint[1]]];

        let visited = create2dArray(this.rows, this.cols, false);
        // Track previous node for path building
        let prev = create2dArray(this.rows, this.cols, null);
        let bfsPath = []

        visited[startPoint[0]][startPoint[1]] = true;

        // Core BFS loop
        while (queue.length > 0) {
            let [row, col] = queue.shift();

            // Once end is found, mark the optimal path
            if (row === endPoint[0] && col === endPoint[1]) {
                let curr = prev[row][col];
                // Populate BFS path by backtracking through prev array from end to start
                while (curr !== null) {
                    bfsPath.push(curr);
                    curr = prev[curr[0]][curr[1]];
                }
            }
            let directions = [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
            ];

            for (let [rowInc, colInc] of directions) {
                let newRow = row + rowInc;
                let newCol = col + colInc;

                if (
                    newRow >= 0 &&
                    newRow < this.rows &&
                    newCol >= 0 &&
                    newCol < this.cols &&
                    !visited[newRow][newCol] &&
                    (grid[newRow][newCol] === 1) // Only move through roads
                ) {
                    // Mark as visited, populate prev, and add to queue
                    visited[newRow][newCol] = true;
                    prev[newRow][newCol] = [row, col];
                    queue.push([newRow, newCol]);
                }
            }
        }

        bfsPath.reverse(); // Reverse to get path from start to end
        bfsPath.push(this.endPoint); // Include end point in path
        return bfsPath;
    }

    getArea(bfsPath = this.bfsPath, desirePaths = this.desirePaths) {
        let areaGrid = create2dArray(this.rows, this.cols, false);

        for (const el of bfsPath) {
            let row = el[0];
            let col = el[1];

            areaGrid[row][col] = true;
        }

        for (const el of desirePaths) {
            for (const subEl of el) {
                let row = subEl[0];
                let col = subEl[1];
                areaGrid[row][col] = true;
            }

        }

        return areaCalc(areaGrid);

    }


    // TODO: See if repetition can be easily reduced with BFS implementation, refineRoadBFS also uses BFS
    /**
     * Obtains BFS-based path between start and endpoint on grid, avoiding obstacles, helper for desire path generation
     * @param {*} grid Input grid with buildings marked as 1s for BFS pathfinding
     * @param {*} startPoint 
     * @param {*} endPoint 
     * @returns Shortest path from start to end on grid using BFS, avoiding obstacles 
     */
    optimalRoadGrid(grid = this.grid, startPoint = this.startPoint, endPoint = this.endPoint) {

        let optimalGrid = create2dArray(this.rows, this.cols, 0);
        // Copy buildings into optimal road grid calculation (not fences)
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (grid[i][j] == 1) {
                    optimalGrid[i][j] = grid[i][j];
                }
            }
        }

        optimalGrid[endPoint[0]][endPoint[1]] = 4; // Mark end point

        // BFS setup
        let queue = [[startPoint[0], startPoint[1]]];
        let visited = create2dArray(this.rows, this.cols, false);
        let prev = create2dArray(this.rows, this.cols, null);
        visited[startPoint[0]][startPoint[1]] = true;

        // Found optimal path
        let optimalPath = [];

        while (queue.length > 0) {
            let [row, col] = queue.shift();

            // Once end is found, mark the optimal path
            if (row === endPoint[0] && col === endPoint[1]) {
                let curr = prev[row][col];
                while (curr !== null) {
                    optimalPath.push(curr);
                    curr = prev[curr[0]][curr[1]];
                }
            }
            // Allow for diagonals in addition to cardinal dirs
            let directions = [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
                [1, 1],
                [-1, -1],
                [1, -1],
                [-1, 1],
            ];

            for (let [rowInc, colInc] of directions) {
                let newRow = row + rowInc;
                let newCol = col + colInc;

                if (
                    newRow >= 0 &&
                    newRow < this.rows &&
                    newCol >= 0 &&
                    newCol < this.cols &&
                    !visited[newRow][newCol] &&
                    (optimalGrid[newRow][newCol] === 0 ||
                        optimalGrid[newRow][newCol] === 4) // Only move through free spaces or to the end
                ) {
                    visited[newRow][newCol] = true;
                    prev[newRow][newCol] = [row, col];
                    queue.push([newRow, newCol]);
                }
            }
        }

        return optimalPath;
    }


    /**
     * Generates desire paths based on portions of suboptimal path improvement factor
     * @param {*} grid 
     * @param {*} bfsPath Suboptimal path to generate desire paths against
     * @param {*} improvementDist distance by which desire path must be shorter than suboptimal path
     * @returns 
     */
    generateDesirePaths(grid = this.grid, bfsPath = this.bfsPath, improvementDist = 5) {
        // list of desire paths that agents can work through
        const desirePaths = [];

        // Bounds for where desire paths are located on the suboptimal path, used for path selection for boids
        const desirePathBounds = []

        const fullPathLength = bfsPath.length;
        let start = 0;
        // First desire path must be 1/4 of the way through path at least
        let end = floor(fullPathLength / 4);
        while (start < fullPathLength && end < fullPathLength && start <= end) {

            // Take segment of suboptimal path and find optimal path from its endpoints
            let suboptimalSubpath = bfsPath.slice(start, end);
            let optimalSubpath = this.optimalRoadGrid(
                grid,
                suboptimalSubpath[0],
                suboptimalSubpath[suboptimalSubpath.length - 1],
            );

            // If optimal subpath meets improvement threshold, add to desire paths
            if (optimalSubpath.length < suboptimalSubpath.length - improvementDist) {
                optimalSubpath.reverse();
                desirePaths.push(optimalSubpath);
                desirePathBounds.push([start, end - 1]);
                start = end;
                // Increase end by a quarter of the full path length to ensure desire paths are sufficiently spread out
                end += floor(fullPathLength / 4) - 2;
            } else {
                end++;
            }
        }
        // path inclusive of start, exclusive of end bounds
        return [desirePaths, desirePathBounds];
    }


    /**
     * Draw a cell with the correct offsets and corner rounding based on adjacent cells to correct buffer
     * @param {*} buffer 
     * @param {*} row 
     * @param {*} col 
     * @param {*} cellSize 
     * @param {*} cornerRadius 
     * @param {*} openCorners array of booleans for if corners are open in p5.js rect order
     * @param {*} fillColor 
     * @param {*} stroked boolean for if cell should be drawn with stroke 
     * @param {*} strokeColor 
     */
    drawCell(buffer, row, col, cellSize, cornerRadius, openCorners, fillColor, stroked = false, strokeColor = undefined) {
        buffer.push();
        buffer.noStroke();
        buffer.fill(fillColor)
        // Add 0.8 to cell size to fill in gaps between cells 
        buffer.rect(col * cellSize, row * cellSize, cellSize + 0.8, cellSize + 0.8, openCorners[0] ? cornerRadius : 0, openCorners[1] ? cornerRadius : 0, openCorners[2] ? cornerRadius : 0, openCorners[3] ? cornerRadius : 0);
        if (stroked) {
            buffer.fill(strokeColor)
            // Allow for 9 pixel gap for outline TODO: consider replacing with variable
            buffer.rect(col * cellSize + 9, row * cellSize + 9, cellSize - 18, cellSize - 18);
        }
        buffer.pop();
    }

    /**
     * Draws core grid in correct order and offsets for transition
     * @param {*} x x pos of grid
     * @param {*} y y pos of grid
     */
    draw(x = 0, y = 0) {
        image(this.blurBuffer, x, y);
        image(this.fenceBuffer, x, y);
        image(this.pathBuffer, x, y); // Dynamic desire path
        image(this.roadBuffer, x, y);
        image(this.buildingBuffer, x, y);
    }


    /**
     * Populates all graphics buffers based on grid values
     */
    populateBackgroundBuffers() {
        // Reset buffers
        this.buildingBuffer.clear();
        this.fenceBuffer.clear();
        this.roadBuffer.clear();
        this.blurBuffer.clear();


        const cellSize = min(width / this.cols, height / this.rows);
        const cornerRadius = cellSize / 4;

        // Draw buildings, fences, and roads to separate buffers 
        // Handles drawing of corners based on adjacent open cells with getFreeCorners
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                let cellValue = this.grid[i][j];
                if (cellValue === 1) { // Building, medium gray
                    let fc = color(BUILDING_MAIN_COLOR)
                    let sc = color(BUILDING_DETAIL_COLOR)
                    let openCorners = getFreeCorners(this.grid, i, j, this.rows, this.cols, 1);
                    this.drawCell(this.buildingBuffer, i, j, cellSize, cornerRadius, openCorners, fc, this.buildingStrokes[i][j], sc)
                } else if (cellValue === 2) {
                    let fc = color(FENCE_COLOR); // Fence, darker gray than building 
                    let sc = color(BACKGROUND_COLOR); 
                    let openCorners = getFreeCorners(this.grid, i, j, this.rows, this.cols, 2);
                    this.drawCell(this.fenceBuffer, i, j, cellSize, cornerRadius, openCorners, fc, true, sc)
                } else if (cellValue === 6) { // Road, medium gray, slightly darker than building
                    let fc = color(ROAD_COLOR)
                    let openCorners = getFreeCorners(this.grid, i, j, this.rows, this.cols, 6);
                    this.drawCell(this.roadBuffer, i, j, cellSize, cornerRadius, openCorners, fc)
                }
            }
        }

        // Add blur to building, fence, and road buffers for glow effect 
        this.blurBuffer.image(this.buildingBuffer, 0, 0);
        this.blurBuffer.image(this.fenceBuffer, 0, 0);
        this.blurBuffer.image(this.roadBuffer, 0, 0);
        this.blurBuffer.filter(BLUR, 5);
    }

    
    /**
     * Encourage garbage collection of old buffers that aren't shared 
     */
    forceGarbageCollectBuffers() {
        // Prevent overload by nullifying old buffers
        this.buildingBuffer = null;
        this.fenceBuffer = null;
        this.roadBuffer = null;

    }
}
