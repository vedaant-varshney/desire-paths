// NOTE: Walker class physics implementation largely derived from: https://natureofcode.com/autonomous-agents/#path-following

/**
 * Boid-based class to represent each agent following a path
 */
class Walker {
    // Constructor initialize all values
    constructor(x, y, minSpeed, maxSpeed, maxForce, path, size = 15, pathBuffer, boidColor = color(255), pathColor = color(180)) {
        this.path = path;
        this.position = createVector(x, y);
        // size of boid
        this.r = size;

        this.minspeed = minSpeed;
        this.maxspeed = maxSpeed;
        this.maxforce = maxForce;
        this.acceleration = createVector(0, 0);

        this.pathBuffer = pathBuffer;
        this.alpha = 255;
        this.boidColor = boidColor;
        this.pathColor = pathColor;


        let initialVelocity = p5.Vector.sub(path.points[1], path.points[0]);
        initialVelocity.normalize();
        initialVelocity.mult(maxSpeed);
        this.velocity = initialVelocity;

        // Current index of path that boid is following
        this.pathIndex = 0;
        this.finished = false;
    }

    /**
     * Handles all path following behaviors for boids
     * @returns 
     */
    applyBehaviors() {
        // If boid has reached target, stop moving
        if (this.finished) {
            this.velocity.mult(0);
            this.acceleration.mult(0);
            return;
        }

        // If boid is close to end of path, mark as finished and start fade out
        if (this.path.points.length > 1) {
            let end = this.path.points[this.path.points.length - 1];
            if (this.position.dist(end) < 20) {
                this.finished = true;
                gsap.to(this, {
                    alpha: 0,
                    duration: 1.5,
                    ease: "none", // Linear easing to reduce risk of FP errors 
                });
                return;
            }
        }

        // Follow path force
        let f = this.follow(this.path);
        // Arbitrary weighting
        f.mult(3);
        // Accumulate in acceleration
        this.applyForce(f);
    }

    /**
     * Simplified acceleration calculation where steering force is added to acceleration
     */
    applyForce(force) {
        this.acceleration.add(force);
    }

    /**
     * Main run function to apply path following behavior, update position, and render boid
     */
    run() {
        this.applyBehaviors();
        this.update();
        this.render();
    }

    // This function implements Craig Reynolds' path following algorithm
    // http://www.red3d.com/cwr/steer/PathFollow.html
    follow() {
        let predict = this.velocity.copy();
        predict.normalize();
        // Predict position FRAMES_LOOKAHEAD frames ahead : pos_new = pos + velocity * frames
        predict.mult(FRAMES_LOOKAHEAD);
        let predictpos = p5.Vector.add(this.position, predict);

        // Now we must find the normal to the path from the predicted position
        // We look at the normal for each line segment and pick out the closest one
        let normal = null;
        let target = null;
        // lowest distance from the path, to find closest line segment
        let worldRecord = 1000000; // Start with a very high worldRecord distance that can easily be beaten
        let best_i = this.pathIndex;

        // Loop through all points of the path, starting from our current known segment
        for (let i = this.pathIndex; i < this.path.points.length - 1; i++) {
            // Look at a line segment
            let a = this.path.points[i];
            let b = this.path.points[i + 1];

            // Get the closest point on the line segment
            let normalPoint = getVectorProjection(a, b, predictpos);

            // Obtain distance from the predicted position to the normal point
            let d = p5.Vector.dist(predictpos, normalPoint);
            // If distance is less than "worldRecord" then new closest path segment and normal point is found 
            if (d <= worldRecord) {

                // Update new normal point and path segment
                worldRecord = d;
                normal = normalPoint;
                best_i = i;

                // Look at the direction of the line segment so we can seek a little bit ahead of the normal
                let dir = p5.Vector.sub(b, a);
                dir.normalize();
                dir.mult(FRAMES_LOOKAHEAD); // Arbitrary lookahead distance
                target = normal.copy();
                target.add(dir);
            }
        }

        // Update current path segment index to the closest one found
        // Future iterations will progress past it
        this.pathIndex = best_i;

        // Only steer if there is a risk of going off the path
        if (target && worldRecord > this.path.radius) {
            // Return force to steer towards target
            return this.seek(target);
        } else {
            return createVector(0, 0);
        }
    }

    /**
     * Physics-based update of position and velocity
     */
    update() {
        // Update velocity
        this.velocity.add(this.acceleration);
        // Limit speed
        this.velocity.limit(this.maxspeed);
        if (this.velocity.mag() < this.minspeed) {
            this.velocity.setMag(this.minspeed);
        }
        this.position.add(this.velocity);
        // Reset accelertion to 0 each cycle
        // Acceleration is later set based on steering forces calculated in applyBehaviors
        this.acceleration.mult(0);
    }

    /**
     * Calculates a steering force towards a target and returns the force vector
     * @param {*} target vector to seek towards
     * @returns steering force vector
     */
    seek(target) {

        // vector pointing from the position to the target
        let desired = p5.Vector.sub(target, this.position);

        // Normalize desired direction and scale to maximum speed
        desired.normalize();
        desired.mult(this.maxspeed);
        // steer force vector = desired direction vector - velocity vector
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxforce); // Limit to maximum steering force
        return steer;
    }


    /**
     * Draw boid and path splatter
     */
    render() {
        // Draw path splatter on path buffer 
        this.pathBuffer.push();

        this.pathBuffer.noStroke();
        this.pathBuffer.fill(this.pathColor);
        this.pathBuffer.translate(this.position.x, this.position.y);

        // Draw randomly sized rectangles within boid bounds for pixel splatter effect
        const numPoints = 5;
        for (let i = 0; i < numPoints; i++) {
            const x = random(-this.r, this.r);
            const y = random(-this.r, this.r);
            const w = random(1, 5);
            const h = random(1, 5);
            this.pathBuffer.rect(x, y, w, h);
        }

        this.pathBuffer.pop();

        // The boid itself is a rounded rectangle drawn directly to the main canvas
        let walkerColor = this.boidColor;
        walkerColor.setAlpha(this.alpha);
        push();
        noStroke();
        fill(walkerColor);
        translate(this.position.x, this.position.y);
        rect(-this.r / 2, -this.r / 2, this.r, this.r, this.r / 4);
        pop();
    }
}


/**
 * Class to spawn boids at a given interval with a quadratic distribution 
 */
class BoidSpawner {

    /**
     * Boid spawner constructor
     * @param {*} startPoint start point for spawned boids
     * @param {*} cellSize size of cells in grid, used to convert path points to xy coordinates
     * @param {*} subOptimalPath suboptimal path that the boid will take if it does not deviate
     * @param {*} desirePaths  set of desire paths that the boid can take instead of the suboptimal path
     * @param {*} desirePathBounds  bounds for where desire paths are
     * @param {*} interval time between spawn attempts in milliseconds
     * @param {*} totalTime time window in seconds where boids can be spawned
     * @param {*} walkers  array to push spawned boids into
     * @param {*} pathBuffer  buffer to draw path splatter onto
     */
    constructor(
        startPoint,
        cellSize,
        subOptimalPath,
        desirePaths,
        desirePathBounds,
        interval = 500,
        totalTime = 20,
        walkers,
        pathBuffer,
    ) {
        this.time = 0;
        this.totalTime = totalTime;
        this.subOptimalPath = subOptimalPath;
        this.desirePaths = desirePaths;
        this.desirePathBounds = desirePathBounds;
        this.pathSelection = new PathSelection(subOptimalPath, desirePaths, desirePathBounds);
        this.walkers = walkers;
        this.pathBuffer = pathBuffer;

        this.intId = setInterval(() => {
            // Spawn boid with quadratic distribution probability (low to high to low) over totalTime duration
            if (quadraticDistribution(this.time, this.totalTime) > random()) {
                // Chance to take desire path is random, increasing in probability as time goes on in life cycle
                let isDesirePath = random() < min(this.time / this.totalTime, 0.6);

                // Choose path for boid to take
                let selectedPath = this.pathSelection.selectPath(isDesirePath);
                // Make radius smaller than cell size to limit how far off the path boids go visually
                let path = new Path(selectedPath, cellSize / 4, cellSize);


                let w = new Walker(
                    startPoint[1] * cellSize + random(0, cellSize), // x
                    startPoint[0] * cellSize + random(0, cellSize), // y
                    random(2, 3), // minSpeed
                    random(4, 5), // maxSpeed
                    random(0.2, 0.5), // maxForce
                    path,
                    cellSize / 3, // boid size
                    this.pathBuffer, // buffer
                    color(BOID_COLOR),
                    color(...PATH_COLOR) 
                );
                this.walkers.push(w);
            }
        }, interval);
    }

    /**
     * Updates time and handles interval cleanup after totalTime has passed
     * Add to main draw loop
     */
    update() {
        this.time += deltaTime / 1000;
        if (this.time > this.totalTime) {
            clearInterval(this.intId);
        }
    }
}
