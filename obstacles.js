/** 
 * Wrapper class to handle obstacle placing logic relating to the grid
 */
class ObstacleWrapper {
    /**
     * Marks a rectangular area of the grid (in-place) as an obstacle 
     * Only updates blank values (0 value)
     * @param {*} grid 
     * @param {*} x top left x coordinate of rectangle
     * @param {*} y top left y coordinate of rectangle
     * @param {*} width width of rectangle
     * @param {*} height height of rectangle
     * @param {*} val value to mark the rectangle with
     */
    static addObstacleRect(grid, x, y, width, height, val) {
        let rows = grid.length;
        let cols = grid[0].length;
        let row = y;
        let col = x;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                let r = row + i;
                let c = col + j;
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                    if (grid[r][c] === 0) {
                        grid[r][c] = val; // Mark as obstacle
                    }
                }
            }
        }
    }

    /**
     * Places rectangular buildings in the grid with some randomization
     * @param {*} grid grid to place buildings in
     * @param {*} buildingDensity chance for a building to be placed in an empty cell
     * @param {*} maxBuildingWidth maximum width of the buildings placed
     * @param {*} maxBuildingHeight maximum height of the buildings placed
     */
    static procedurallyPlaceBuildings(
        grid,
        buildingDensity = 0.05,
        maxBuildingWidth = 7,
        maxBuildingHeight = 8,
    ) {
        let rows = grid.length;
        let cols = grid[0].length;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] === 0 && Math.random() < buildingDensity) {
                    let buildingWidth = Math.floor(Math.random() * maxBuildingWidth) + 2;
                    let buildingHeight =
                        Math.floor(Math.random() * maxBuildingHeight) + 2;
                    this.addObstacleRect(grid, j, i, buildingWidth, buildingHeight, 1);
                }
            }
        }
    }

    /**
     * Places permable fences in the grid with some randomization
     * @param {*} grid  grid to place fences in
     * @param {*} fenceDensity chance for a fence to be placed in an empty cell
     * @param {*} maxFenceLength maximum length of the fences placed
     */
    static procedurallyPlaceFences(grid, fenceDensity = 0.04, maxFenceLength = 7) {
        let rows = grid.length;
        let cols = grid[0].length;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] === 0 && Math.random() < fenceDensity) {
                    // Randomly decide if fence is horizontal or vertical, randomly pick length < maxFenceLength
                    let isHorizontal = random() > 0.5;
                    let length = Math.floor(Math.random() * maxFenceLength) + 3;
                    this.addObstacleRect(
                        grid,
                        j,
                        i,
                        isHorizontal ? length : 1,
                        isHorizontal ? 1 : length,
                        2
                    );
                }
            }
        }
    }

    /**
     * Populates a grid with pseudo obstacles along a path, used to hinder initial suboptimal road generation
     * @param {*} rows total rows
     * @param {*} cols total cols
     * @param {*} startPoint start point of path
     * @param {*} endPoint  end point of path
     * @returns grid with pseudo obstacles placed, marked by 1s
     */
    static pseudoObstaclePopulate(rows, cols, startPoint, endPoint) {
        let grid = create2dArray(rows, cols, 0);

        // Coordinates 1/3, 1/2, and 2/3 along the path from start to end
        let rowThird = Math.floor(((startPoint[0] + endPoint[0])) / 3);
        let colThird = Math.floor(((startPoint[1] + endPoint[1])) / 3);

        let rowHalf = Math.floor((startPoint[0] + endPoint[0]) / 2);
        let colHalf = Math.floor((startPoint[1] + endPoint[1]) / 2);

        let rowTwoThird = Math.floor((2 * (startPoint[0] + endPoint[0])) / 3);
        let colTwoThird = Math.floor((2 * (startPoint[1] + endPoint[1])) / 3);

        // Randomly choose building size, proportional to grid size,
        let buildingHalfSize = floor(min(rows, cols) * random(0.1, 0.2));

        // Place pseudo obstacles
        ObstacleWrapper.addObstacleRect(grid, colThird - buildingHalfSize, rowThird - buildingHalfSize, 2 * buildingHalfSize, 2 * buildingHalfSize, 1);
        ObstacleWrapper.addObstacleRect(grid, colHalf - buildingHalfSize, rowHalf - buildingHalfSize, 2 * buildingHalfSize, 2 * buildingHalfSize, 1);
        ObstacleWrapper.addObstacleRect(grid, colTwoThird - buildingHalfSize, rowTwoThird - buildingHalfSize, 2 * buildingHalfSize, 2 * buildingHalfSize, 1);
        return grid;
    }

}
