/**
 * Calculates a quadratic distribution, returns values [0, 1]
 * @param {*} n value to calculate distribution for
 * @param {*} width range of accepted n values starting at 0
 * @returns
 */
function quadraticDistribution(n, width) {
  const a = 1 / (width / 2);
  return -1 * (a * n - 1) ** 2 + 1;
}

// NOTE: Adapted from my CS488 notes
/**
 * Gets the projection of a vector onto a line segment
 * @param {*} a p1 of line segment
 * @param {*} b p2 of line segment
 * @param {*} p point to project
 * @returns vector projection of p onto line segment ab
 */
function getVectorProjection(a, b, p) {
  const ab = p5.Vector.sub(b, a);
  const ap = p5.Vector.sub(p, a);

  // Scalar proportion of projection
  const proj = ap.dot(ab) / ab.magSq();

  // Clamp projection to line segment if projection is out of bounds
  if (proj < 0) {
    return a.copy();
  } else if (proj > 1) {
    return b.copy();
  } else {
    // Obtain projection point
    return p5.Vector.add(a, ab.mult(proj));
  }
}


/**
 * Creates a 2d array with the given dimensions and fills it with the default value
 * @param {*} rows
 * @param {*} cols
 * @param {*} defaultValue
 * @returns
 */
function create2dArray(rows, cols, defaultValue) {
  return new Array(rows).fill().map(() => new Array(cols).fill(defaultValue));
}

/**
 * Calculates the manhattan distance between two points
 */
function manhattanDistance(p1, p2) {
  return Math.abs(p1[0] - p2[0]) + Math.abs(p1[1] - p2[1]);
}


// From: https://coreui.io/answers/how-to-shuffle-an-array-in-javascript/
/**
 * Shuffles an array in place
 * @param {*} array 
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
