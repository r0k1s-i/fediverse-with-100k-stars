
export var InteractionMath = {};

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

InteractionMath.findClosestInstance = function(rayOrigin, rayDirection, instances, threshold) {
    var closestScore = Infinity;
    var closestInstance = null;
    var thresholdSq = threshold * threshold;

    var MIN_COS_ANGLE = 0.5;

    var MIN_SIZE_MULTIPLIER = 0.15;
    var MAX_SIZE_MULTIPLIER = 1.0;

    for (var i = 0; i < instances.length; i++) {
        var instance = instances[i];
        if (!instance.position) continue;

        var point = instance.position;
        
        var diff = subVectors(point, rayOrigin);
        
        var directionDistance = dotProduct(diff, rayDirection);
        if (directionDistance <= 0) continue;

        var diffLenSq = lengthSq(diff);
        if (diffLenSq > 0) {
            var cosAngle = directionDistance / Math.sqrt(diffLenSq);
            if (cosAngle < MIN_COS_ANGLE) {
                continue;
            }
        }

        var cross = crossProduct(diff, rayDirection);
        var perpendicularDistSq = lengthSq(cross);

        var distanceFactor = Math.max(1, directionDistance / 1000);
        var adjustedThresholdSq = thresholdSq / distanceFactor;

        var userCount = instance.stats ? instance.stats.user_count : 1;
        var sizeMultiplier = Math.log10(userCount + 1) / 6;
        sizeMultiplier = Math.max(MIN_SIZE_MULTIPLIER, Math.min(MAX_SIZE_MULTIPLIER, sizeMultiplier));
        adjustedThresholdSq *= sizeMultiplier * sizeMultiplier;

        if (perpendicularDistSq < adjustedThresholdSq) {
            var score = perpendicularDistSq + directionDistance * 0.1;
            if (score < closestScore) {
                closestScore = score;
                closestInstance = instance;
            }
        }
    }

    return closestInstance;
};

window.InteractionMath = InteractionMath;
