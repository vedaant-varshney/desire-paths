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


let resizeTimer = null;

function setup() {
    createCanvas(windowWidth, windowHeight);

    noiseBuffer = createGraphics(width, height);
    pathBuffer = createGraphics(width, height);
    transitionBuffer = createGraphics(width, height);
    blurBuffer = createGraphics(width, height);

    populateNoiseBuffer();

    // First grid goes from left to right with random row value
    buildScene(null, null);
}


/**
 * Derive the grid size from the actual canvas aspect ratio, instead of
 * assuming 16:9. Rows stay at 27; cols are derived from the aspect ratio,
 * so the grid fills the width and the height (to within one cell) on any
 * screen size. At 16:9 this gives exactly the old values: 27 rows, 48 cols.
 */
function computeGridSize() {
    rows = 27;
    // Round to the nearest column count, not floor: floor under-counts
    // when the exact count is just above an integer (e.g. 81.8 -> 81),
    // leaving almost a whole cell uncovered. Rounding picks the count
    // closest to the true aspect ratio, minimising the leftover strip
    // on either side (at most about half a cell, usually far less).
    cols = max(8, round(rows * width / height));
    // Calculate cell size based on rows and cols to fit the screen
    cellSize = min(width / cols, height / rows);
}


/**
 * Minimum Manhattan distance between a scene's start and end points.
 * Was a fixed 25, which is a large fraction of a small (e.g. portrait)
 * grid and can make transition() loop for a long time. Scale it with
 * the grid size; at 27x48 this is still 25.
 */
function minEndpointDistance() {
    return min(25, floor((rows + cols) / 3));
}


/**
 * Create the one-time noise texture for the background, sized to the
 * current canvas. Called from setup() and from rebuildForNewSize().
 */
function populateNoiseBuffer() {
    noiseBuffer.clear();
    let noiseAmount = floor(width * height * 0.02); // noise density based on screen size
    for (let i = 0; i < noiseAmount; i++) {
        noiseBuffer.noStroke()
        let x = random(width);
        let y = random(height);
        noiseBuffer.fill(random(NOISE_COLOR), 50)
        noiseBuffer.rect(x, y, 2, 2);
    }
}


/**
 * Build a fresh scene for the current canvas size. startPoint is
 * [row, col]; if endPoint is null, a random end point on the right edge
 * is chosen, as in the original setup().
 */
function buildScene(startPoint, endPoint) {
    computeGridSize();

    if (startPoint === null) {
        startPoint = [floor(random(1, rows - 1)), 0];
    }
    if (endPoint === null) {
        endPoint = [floor(random(1, rows - 1)), cols - 1];
    }

    grid = new Grid(rows, cols, startPoint, endPoint, pathBuffer, blurBuffer);
    // Add road, buffers, and engage spawner
    grid.addRoad();
    grid.populateBackgroundBuffers();
    spawner = new BoidSpawner(grid.startPoint, cellSize, grid.bfsPath, grid.desirePaths, grid.desirePathBounds, SPAWN_INTERVAL, CYCLE_DURATION, walkers, pathBuffer);
}


/**
 * p5 calls this when the window is resized. The canvas is resized
 * immediately, and the scene is rebuilt 300ms after the last resize
 * event, so dragging a window edge does not rebuild the (expensive)
 * grid on every intermediate size. Rebuilding restarts the current
 * scene, which is the cleanest behaviour for a new aspect ratio.
 */
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (resizeTimer) {
        clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(rebuildForNewSize, 300);
}


function rebuildForNewSize() {
    resizeTimer = null;

    // Stop the old spawner so its interval does not keep spawning
    // boids into the discarded walkers array.
    if (spawner && spawner.intId) {
        clearInterval(spawner.intId);
    }
    walkers = [];
    time = 0;
    animProperties.transitionX = 0;
    animProperties.transitionY = 0;
    animProperties.gridX = 0;
    animProperties.gridY = 0;

    // Recreate the full-size buffers for the new canvas size
    noiseBuffer = createGraphics(width, height);
    pathBuffer = createGraphics(width, height);
    transitionBuffer = createGraphics(width, height);
    blurBuffer = createGraphics(width, height);
    populateNoiseBuffer();

    if (grid) {
        grid.forceGarbageCollectBuffers();
    }

    buildScene(null, null);
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
    // Ensure new end point is far enough away for interesting paths.
    // The threshold scales with the grid size (see minEndpointDistance),
    // so it stays reachable on small / portrait grids.
    let dist = 0;
    while (dist < minEndpointDistance()) {
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

