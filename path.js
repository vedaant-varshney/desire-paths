
/**
 * Class to take [row, col] points and transform points into XY coordinate plane
 */
class Path {
    constructor(points, radius = 5, cellSize) {
        // Transform row, col into xy coordinates
        this.points = points.map((point) =>
            createVector(
                point[1] * cellSize + cellSize / 2,
                point[0] * cellSize + cellSize / 2,
            ),
        );
        this.radius = radius;
        this.cellSize = cellSize;
    }

    /**
     * Helper method to visualize the specific paths
     */
    draw() {
        push();
        noFill();

        // Draw the thick path
        stroke(255, 204, 0);
        strokeWeight(this.radius * 2);
        beginShape();
        for (let p of this.points) {
            vertex(p.x, p.y);
        }
        endShape();

        // Draw the thin centerline
        stroke(255, 204, 255);
        strokeWeight(1);
        beginShape();
        for (let p of this.points) {
            vertex(p.x, p.y);
        }
        endShape();
        pop();
    }

}


/**
 * Class to select a path for each boid based on a suboptimal path and a set of desire paths 
 */
class PathSelection {

    /**
     * Path selection constructor
     * @param {*} subOptimalRoad suboptimal path that the boid will take if it does not deviate
     * @param {*} desirePaths set of desire paths that the boid can take instead of the suboptimal path
     * @param {*} desirePathBounds bounds for where the desire paths are located on the suboptimal path
     */
    constructor(
        subOptimalRoad,
        desirePaths,
        desirePathBounds,
    ) {
        this.subOptimalRoad = subOptimalRoad;
        this.desirePaths = desirePaths;
        this.desirePathBounds = desirePathBounds;
    }

    /**
     * Determines the path a boid must take
     * @param {*} isDesirePath Whether or not boid should follow desire path
     * @returns [x, y] point path selected for a boid
     */
    selectPath(isDesirePath = false) {
        let i = 0;
        let boundIdx = 0;
        let boundIdxMax = this.desirePathBounds.length;
        let path = [];

        // Iterate through the sub-optimal road, replacing the path with the desire path if necessary
        while (i < this.subOptimalRoad.length) {
            if (boundIdx >= boundIdxMax || i < this.desirePathBounds[boundIdx][0]) {
                // Use suboptimal road since no desire path is available or we have not reached the next desire path 
                path.push(this.subOptimalRoad[i]);
                i++;
            } else if (i === this.desirePathBounds[boundIdx][0]) {
                if (isDesirePath) {
                    // Use desire path instead of suboptimal path
                    // Add desire path to path and move i to end location of desire path
                    path = path.concat(this.desirePaths[boundIdx]);
                    i = this.desirePathBounds[boundIdx][1];
                    boundIdx++;
                }
                else {
                    // Use suboptimal path
                    path.push(this.subOptimalRoad[i]);
                    i++;
                    boundIdx++;
                }
            }
        }
        return path;
    }
}
