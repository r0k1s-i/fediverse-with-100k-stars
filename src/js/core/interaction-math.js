/**
 * InteractionMath - Unified interaction detection for Fediverse instances
 *
 * Purpose: Centralized ray-based instance detection replacing scattered
 *          Raycaster + mesh intersection logic.
 *
 * @see docs/plans/codebase-optimization-review.md (P0-3)
 */
import { INTERACTION, VISIBILITY } from "./constants.js";

export var InteractionMath = {};

// ============================================================================
// VECTOR MATH UTILITIES (Pure functions, no THREE.js dependency)
// ============================================================================

function subVectors(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function crossProduct(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dotProduct(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function lengthSq(v) {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

// ============================================================================
// THRESHOLD CALCULATION
// ============================================================================

/**
 * Calculate dynamic interaction threshold based on camera distance
 * @param {number} cameraZ - Current camera Z position
 * @returns {number} Threshold value for instance detection
 */
InteractionMath.getDynamicThreshold = function (cameraZ) {
  if (typeof cameraZ === "undefined" || cameraZ === null) {
    return INTERACTION.THRESHOLD.BASE;
  }

  var z = Math.abs(cameraZ);
  var dynamicThreshold = z * INTERACTION.THRESHOLD.DYNAMIC_FACTOR;

  return Math.max(INTERACTION.THRESHOLD.MIN, dynamicThreshold);
};

// ============================================================================
// INSTANCE DETECTION
// ============================================================================

/**
 * Find the closest Fediverse instance along a ray
 *
 * Uses ray-point distance calculation with adjustments for:
 * - Instance size (based on user_count)
 * - Distance falloff (farther instances need closer alignment)
 * - Angle filtering (ignore instances at extreme angles)
 *
 * @param {Object} rayOrigin - Ray origin point {x, y, z}
 * @param {Object} rayDirection - Normalized ray direction {x, y, z}
 * @param {Array} instances - Array of instance objects with position property
 * @param {number} threshold - Base threshold for detection
 * @returns {Object|null} Closest instance or null if none found
 */
InteractionMath.findClosestInstance = function (
  rayOrigin,
  rayDirection,
  instances,
  threshold,
) {
  var closestScore = Infinity;
  var closestInstance = null;
  var thresholdSq = threshold * threshold;

  // Use constants from centralized config
  var RAY = INTERACTION.RAY_DETECTION;

  for (var i = 0; i < instances.length; i++) {
    var instance = instances[i];
    if (!instance.position) continue;

    var point = instance.position;

    // Vector from ray origin to point
    var diff = subVectors(point, rayOrigin);

    // Distance along ray direction (dot product)
    var directionDistance = dotProduct(diff, rayDirection);
    if (directionDistance <= 0) continue; // Behind camera

    // Angle filtering: skip instances at extreme angles
    var diffLenSq = lengthSq(diff);
    if (diffLenSq > 0) {
      var cosAngle = directionDistance / Math.sqrt(diffLenSq);
      if (cosAngle < RAY.MIN_COS_ANGLE) {
        continue;
      }
    }

    // Perpendicular distance from ray (cross product magnitude)
    var cross = crossProduct(diff, rayDirection);
    var perpendicularDistSq = lengthSq(cross);

    // Adjust threshold based on distance (farther = stricter)
    var distanceFactor = Math.max(1, directionDistance / RAY.DISTANCE_DIVISOR);
    var adjustedThresholdSq = thresholdSq / distanceFactor;

    // Adjust for instance size (larger instances = easier to hit)
    var userCount = instance.stats ? instance.stats.user_count : 1;
    var sizeMultiplier = Math.log10(userCount + 1) / 6;
    sizeMultiplier = Math.max(
      RAY.MIN_SIZE_MULTIPLIER,
      Math.min(RAY.MAX_SIZE_MULTIPLIER, sizeMultiplier),
    );
    adjustedThresholdSq *= sizeMultiplier * sizeMultiplier;

    if (perpendicularDistSq < adjustedThresholdSq) {
      // Score: prefer closer perpendicular distance, slight preference for nearer depth
      var score =
        perpendicularDistSq + directionDistance * RAY.DIRECTION_WEIGHT;
      if (score < closestScore) {
        closestScore = score;
        closestInstance = instance;
      }
    }
  }

  return closestInstance;
};

/**
 * Check if camera is zoomed in close enough to hide hover tooltips
 * @param {number} cameraZ - Current camera Z position
 * @param {Object} markerThreshold - Marker threshold object with min property
 * @returns {boolean} True if zoomed in close
 */
InteractionMath.isZoomedInClose = function (cameraZ, markerThreshold) {
  if (typeof markerThreshold === "undefined" || markerThreshold === null) {
    return cameraZ < VISIBILITY.MARKER.MIN_Z;
  }
  return cameraZ < markerThreshold.min;
};

window.InteractionMath = InteractionMath;
