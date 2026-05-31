const FREE_VALUE = 0;
const BUILDING_VALUE = 1;
const FENCE_VALUE = 2;


// Duration of boid spawning (seconds)
const CYCLE_DURATION = 20;
// Interval between boid spawn polling (ms)
const SPAWN_INTERVAL = 300;

// Transition ease
const TRANSITION_EASE = "power1.inOut";
// Duration of transition between grids (seconds)
const TRANSITION_DURATION = 2.5;


// Colors
// TODO: add all colors here and refer across codebase
const BACKGROUND_COLOR = 15; // dark gray
const ROAD_COLOR = 70;
const BUILDING_MAIN_COLOR = 86;
const BUILDING_DETAIL_COLOR = 50;
const FENCE_COLOR = 50;
const BOID_COLOR = 255;
const NOISE_COLOR = 100;
const PATH_COLOR = [255, 0, 0, 30];


// Frame lookahead for boid functions
const FRAMES_LOOKAHEAD = 15;


// Flags
const DEEP_DEBUG = false;

console.log("Constants loaded")
