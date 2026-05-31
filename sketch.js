let time = 0;
let rows;
let cols;
let cellSize;

// State of grid, boids, and spawner
let grid;
let walkers = []
let spawner;

// Buffers
let transitionBuffer;
let noiseBuffer;
let pathBuffer;

let blurBuffer; // Shared blur buffer to avoid creating new WEBGL contexts

// Animation properties for gsap transitions and buffer locations
let animProperties = {
    transitionX: 0,
    transitionY: 0,
    gridX: 0,
    gridY: 0,
};


function setup() {
    createCanvas(windowWidth, windowHeight);

    noiseBuffer = createGraphics(width, height);
    pathBuffer = createGraphics(width, height);
    transitionBuffer = createGraphics(width, height);
    blurBuffer = createGraphics(width, height);

    // Create one-time noise texture for background
    let noiseAmount = floor(width * height * 0.02); // noise density based on screen size
    for (let i = 0; i < noiseAmount; i++) {
        noiseBuffer.noStroke()
        let x = random(width);
        let y = random(height);
        noiseBuffer.fill(random(NOISE_COLOR), 50)
        noiseBuffer.rect(x, y, 2, 2);
    }

    // Hardcode rows to be divisible by 9 for clean cell size at 16:9 ratio, calculate cols based on number of rows 
    rows = 27;
    cols = ceil((rows / 9) * 16);
    // Calculate cell size based on rows and cols to fit the screen
    cellSize = min(width / cols, height / rows);


    // First grid goes from left to right with random col value
    grid = new Grid(rows, cols, [floor(random(1, rows - 1)), 0], [floor(random(1, rows - 1)), cols - 1], pathBuffer, blurBuffer);
    // Add road, buffers, and engage spawner
    grid.addRoad();
    grid.populateBackgroundBuffers();
    spawner = new BoidSpawner(grid.startPoint, cellSize, grid.bfsPath, grid.desirePaths, grid.desirePathBounds, SPAWN_INTERVAL, CYCLE_DURATION, walkers, pathBuffer);
}


function draw() {
    time += deltaTime / 1000;

    if (spawner) {
        spawner.update();
    }

    // Draw background + noise
    background(color(BACKGROUND_COLOR));
    image(noiseBuffer, 0, 0);

    // Draw static grid and dynamic path information
    grid.draw(animProperties.gridX, animProperties.gridY);


    // Run walker logic and drawing, remove if finished and transparent (with tolerance)
    for (let i = walkers.length - 1; i >= 0; i--) {
        const w = walkers[i];
        w.run();

        if (w.finished && w.alpha < 0.01) {
            walkers.splice(i, 1);
        }
    }

    // Engage transition logic once walkers are finished, with some buffer time to prevent immediate transition
    if (time > 10 && walkers.length === 0) {
        time = 0;
        walkers = [];
        transitionBuffer.image(this, 0, 0)
        transition();
    }

    // Draw transition buffer on top with animation properties for gsap transitions
    image(transitionBuffer, animProperties.transitionX, animProperties.transitionY)
}



/**
 * Logic to handle transition between grids
 */
function transition() {
    // Save current grid as image in transition buffer for animation
    transitionBuffer.image(this, 0, 0)
    // Clear pathBuffer since its shared
    pathBuffer.clear();

    let prevEndPoint = grid.endPoint;

    // Decide if new end should be on bottom or not
    const newEndOnBottom = random() > 0.5 ? true : false
    let prevEndPointOnBottom = prevEndPoint[0] === rows - 1;

    // Set animation properties for grid based on prev end point location
    if (prevEndPointOnBottom) {
        animProperties.gridX = 0;
        animProperties.gridY = height;
    }
    else {
        animProperties.gridX = width;
        animProperties.gridY = 0;
    }

    let newStartPoint;
    let newEndPoint;

    // Previously ended on right
    if (prevEndPoint[1] === cols - 1) {
        // Now start on right side
        newStartPoint = [prevEndPoint[0], 0];

    }
    // Previously ended on bottom
    else if (prevEndPoint[0] === rows - 1) {
        // Now start on top
        newStartPoint = [0, prevEndPoint[1]];
    }

    // Choose a new end point an opposite side from the new start point
    // Ensure new end point is at least 25 units away for interesting paths
    let dist = 0;
    while (dist < 25) {
        if (newEndOnBottom) {
            newEndPoint = [rows - 1, floor(random(1, cols - 1))];
        }
        else {
            newEndPoint = [floor(random(1, rows - 1)), cols - 1];
        }
        dist = manhattanDistance(newStartPoint, newEndPoint)
    }

    if (DEEP_DEBUG) {
        console.log("Prev start: ", grid.startPoint, "Prev end: ", grid.endPoint)
        console.log("New start: ", newStartPoint, "New end: ", newEndPoint)
    }

    // Recreate and replace grid with new start and end points, add road and populate buffers
    let newGrid = new Grid(rows, cols, newStartPoint, newEndPoint, pathBuffer, blurBuffer);
    newGrid.addRoad();
    newGrid.populateBackgroundBuffers();
    grid.forceGarbageCollectBuffers();
    grid = newGrid;


    transitionAnimation(prevEndPointOnBottom);
}

/**
 * Animation and gsap logic for transition between grids
 * @param {*} prevEndPointOnBottom boolean for if previous end point was on bottom of grid 
 */
function transitionAnimation(prevEndPointOnBottom) {
    let gridProperty = prevEndPointOnBottom ? "gridY" : "gridX";
    let transitionProperty = prevEndPointOnBottom ? "transitionY" : "transitionX";

    // NOTE: properties are computed as expressions with [] syntax to allow dynamic property names

    // Animate transition buffer sliding out of frame depending on previous end location
    gsap.to(animProperties, {
        [transitionProperty]: prevEndPointOnBottom ? -height : -width,
        duration: TRANSITION_DURATION,
        ease: TRANSITION_EASE,
        onComplete: transitionComplete
    })

    // Slide grid in from opposite direction of transition buffer slide out
    gsap.to(animProperties, {
        [gridProperty]: 0,
        duration: TRANSITION_DURATION,
        ease: TRANSITION_EASE
    })


    /**
     * Callback to reset properties, time, and create spawner after transition animation is complete to start next cycle
     */
    function transitionComplete() {
        animProperties.transitionX = 0;
        animProperties.transitionY = 0;
        transitionBuffer.clear();
        spawner = new BoidSpawner(grid.startPoint, cellSize, grid.bfsPath, grid.desirePaths, grid.desirePathBounds, SPAWN_INTERVAL, CYCLE_DURATION, walkers, pathBuffer);
        time = 0;
    }

}

