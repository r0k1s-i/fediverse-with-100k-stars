(function(root) {
    
    var InteractionMath = {};

    function subVectors(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }

    function crossProduct(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    function dotProduct(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    function lengthSq(v) {
        return v.x * v.x + v.y * v.y + v.z * v.z;
    }

    function distanceToSquared(a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }

    InteractionMath.findClosestInstance = function(rayOrigin, rayDirection, instances, threshold) {
        var closestScore = Infinity;
        var closestInstance = null;
        var thresholdSq = threshold * threshold;

        // Minimum cosine of angle between ray and instance direction
        // cos(30°) ≈ 0.866, cos(45°) ≈ 0.707, cos(60°) ≈ 0.5
        // Use a loose value to allow some tolerance
        var MIN_COS_ANGLE = 0.5;

        // Min/max size multipliers for threshold scaling based on instance size
        var MIN_SIZE_MULTIPLIER = 0.15;
        var MAX_SIZE_MULTIPLIER = 1.0;

        for (var i = 0; i < instances.length; i++) {
            var instance = instances[i];
            if (!instance.position) continue;

            var point = instance.position;
            
            var diff = subVectors(point, rayOrigin);
            
            var directionDistance = dotProduct(diff, rayDirection);
            if (directionDistance <= 0) continue;

            // View frustum filter: only consider instances roughly in the direction we're looking
            var diffLenSq = lengthSq(diff);
            if (diffLenSq > 0) {
                var cosAngle = directionDistance / Math.sqrt(diffLenSq);
                if (cosAngle < MIN_COS_ANGLE) {
                    // Instance is too far off from the ray direction, skip it
                    continue;
                }
            }

            var cross = crossProduct(diff, rayDirection);
            var perpendicularDistSq = lengthSq(cross);

            // Dynamic threshold based on distance - farther objects need tighter aim
            var distanceFactor = Math.max(1, directionDistance / 1000);
            var adjustedThresholdSq = thresholdSq / distanceFactor;

            // Scale threshold based on instance size (user count)
            var userCount = instance.stats ? instance.stats.user_count : 1;
            var sizeMultiplier = Math.log10(userCount + 1) / 6;
            sizeMultiplier = Math.max(MIN_SIZE_MULTIPLIER, Math.min(MAX_SIZE_MULTIPLIER, sizeMultiplier));
            adjustedThresholdSq *= sizeMultiplier * sizeMultiplier;

            if (perpendicularDistSq < adjustedThresholdSq) {
                // Score prioritizes:
                // 1. Perpendicular distance (how close ray passes to object)
                // 2. Direction distance with significant weight (prefer closer objects)
                var score = perpendicularDistSq + directionDistance * 0.1;
                if (score < closestScore) {
                    closestScore = score;
                    closestInstance = instance;
                }
            }
        }

        return closestInstance;
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = InteractionMath;
    } 
    else {
        root.InteractionMath = InteractionMath;
    }

})(this);
