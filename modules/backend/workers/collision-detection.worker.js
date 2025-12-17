/* eslint-disable no-undef */
/**
 * Collision Detection Worker
 * Phase 13.2: Performance Improvements - WebWorker Implementation
 *
 * Background worker for detecting collisions between tool and workpiece/fixtures
 * Performs AABB and geometry-based collision tests
 */

/**
 * AABB (Axis-Aligned Bounding Box) collision test
 * @param {Object} box1 - {min: {x,y,z}, max: {x,y,z}}
 * @param {Object} box2 - {min: {x,y,z}, max: {x,y,z}}
 * @returns {boolean} True if boxes overlap
 */
function testAABBCollision(box1, box2) {
  return (
    box1.min.x <= box2.max.x &&
    box1.max.x >= box2.min.x &&
    box1.min.y <= box2.max.y &&
    box1.max.y >= box2.min.y &&
    box1.min.z <= box2.max.z &&
    box1.max.z >= box2.min.z
  );
}

/**
 * Sphere-to-sphere collision test
 * @param {Object} sphere1 - {center: {x,y,z}, radius}
 * @param {Object} sphere2 - {center: {x,y,z}, radius}
 * @returns {boolean} True if spheres overlap
 */
function testSphereCollision(sphere1, sphere2) {
  const dx = sphere1.center.x - sphere2.center.x;
  const dy = sphere1.center.y - sphere2.center.y;
  const dz = sphere1.center.z - sphere2.center.z;

  const distSq = dx * dx + dy * dy + dz * dz;
  const radiusSum = sphere1.radius + sphere2.radius;

  return distSq < radiusSum * radiusSum;
}

/**
 * Point-to-box distance check
 * @param {Object} point - {x, y, z}
 * @param {Object} box - {min: {x,y,z}, max: {x,y,z}}
 * @returns {number} Distance to closest point on box (0 if inside)
 */
function pointToBoxDistance(point, box) {
  let dx = 0;
  let dy = 0;
  let dz = 0;

  if (point.x < box.min.x) dx = box.min.x - point.x;
  else if (point.x > box.max.x) dx = point.x - box.max.x;

  if (point.y < box.min.y) dy = box.min.y - point.y;
  else if (point.y > box.max.y) dy = point.y - box.max.y;

  if (point.z < box.min.z) dz = box.min.z - point.z;
  else if (point.z > box.max.z) dz = point.z - box.max.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check collision between tool (sphere) and obstacles (AABBs)
 * @param {Object} tool - {position: {x,y,z}, radius}
 * @param {Array} obstacles - Array of boxes
 * @returns {Object} {collision: boolean, nearestDistance: number, collidedObstacles: Array}
 */
function checkToolCollisions(tool, obstacles) {
  const result = {
    collision: false,
    nearestDistance: Infinity,
    collidedObstacles: [],
    warnings: [],
  };

  for (let i = 0; i < obstacles.length; i++) {
    const obstacle = obstacles[i];
    const dist = pointToBoxDistance(tool.position, obstacle);

    if (dist < result.nearestDistance) {
      result.nearestDistance = dist;
    }

    if (dist < tool.radius) {
      result.collision = true;
      result.collidedObstacles.push({
        id: i,
        distance: dist,
        obstacle,
      });
    } else if (dist < tool.radius * 2) {
      result.warnings.push({
        id: i,
        distance: dist,
        message: `Near obstacle ${i}: ${dist.toFixed(2)}mm away`,
      });
    }
  }

  return result;
}

/**
 * Check collision along a linear path
 * @param {Object} start - {x, y, z}
 * @param {Object} end - {x, y, z}
 * @param {number} radius - Tool radius
 * @param {Array} obstacles - Array of obstacle boxes
 * @param {number} samples - Number of interpolation samples
 * @returns {Object} {collision: boolean, collisionPoint: {x,y,z}, sample: number}
 */
function checkPathCollision(start, end, radius, obstacles, samples = 10) {
  const result = {
    collision: false,
    collisionPoint: null,
    collisionSample: -1,
  };

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pos = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      z: start.z + (end.z - start.z) * t,
    };

    const tool = { position: pos, radius };
    const collision = checkToolCollisions(tool, obstacles);

    if (collision.collision) {
      result.collision = true;
      result.collisionPoint = pos;
      result.collisionSample = i;
      break;
    }
  }

  return result;
}

/**
 * Batch collision check for multiple commands
 * @param {Array} commands - G-Code commands with positions
 * @param {Array} obstacles - Obstacle boxes
 * @param {number} toolRadius - Tool radius
 * @returns {Array} Collision results for each command
 */
function batchCheckCollisions(commands, obstacles, toolRadius) {
  const results = [];
  let previousPos = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const params = cmd.params || {};

    // Get end position
    const endPos = {
      x: params.X !== undefined ? params.X : previousPos.x,
      y: params.Y !== undefined ? params.Y : previousPos.y,
      z: params.Z !== undefined ? params.Z : previousPos.z,
    };

    // Check static collision
    const staticCheck = checkToolCollisions({ position: endPos, radius: toolRadius }, obstacles);

    // Check path collision for G1/G0 moves
    let pathCheck = { collision: false };
    if (cmd.gCode === 1 || cmd.gCode === 0) {
      pathCheck = checkPathCollision(previousPos, endPos, toolRadius, obstacles, 5);
    }

    results.push({
      commandIndex: i,
      lineNumber: cmd.lineNumber || i,
      gCode: cmd.gCode,
      position: endPos,
      staticCollision: staticCheck.collision,
      pathCollision: pathCheck.collision,
      nearestDistance: staticCheck.nearestDistance,
      warnings: staticCheck.warnings,
      collisions: [
        ...staticCheck.collidedObstacles,
        ...(pathCheck.collision ? [{ type: 'path', point: pathCheck.collisionPoint }] : []),
      ],
    });

    previousPos = endPos;
  }

  return results;
}

/**
 * Worker message handler
 */
self.addEventListener('message', (event) => {
  const { command, data } = event.data;

  try {
    let result;

    switch (command) {
      case 'testAABB': {
        const { box1, box2 } = data;
        result = testAABBCollision(box1, box2);
        break;
      }

      case 'testSphere': {
        const { sphere1, sphere2 } = data;
        result = testSphereCollision(sphere1, sphere2);
        break;
      }

      case 'pointDistance': {
        const { point, box } = data;
        result = pointToBoxDistance(point, box);
        break;
      }

      case 'checkToolCollisions': {
        const { tool, obstacles } = data;
        result = checkToolCollisions(tool, obstacles);
        break;
      }

      case 'checkPathCollision': {
        const { start, end, radius, obstacles, samples } = data;
        result = checkPathCollision(start, end, radius, obstacles, samples || 10);
        break;
      }

      case 'batchCheckCollisions': {
        const { commands, obstacles, toolRadius } = data;
        result = batchCheckCollisions(commands, obstacles, toolRadius);
        break;
      }

      default:
        throw new Error(`Unknown collision worker command: ${command}`);
    }

    self.postMessage({
      success: true,
      result,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
    });
  }
});
