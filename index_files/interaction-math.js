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

        for (var i = 0; i < instances.length; i++) {
            var instance = instances[i];
            if (!instance.position) continue;

            var point = instance.position;
            
            var diff = subVectors(point, rayOrigin);
            
            var directionDistance = dotProduct(diff, rayDirection);
            if (directionDistance <= 0) continue;

            var cross = crossProduct(diff, rayDirection);
            var perpendicularDistSq = lengthSq(cross);

            // Dynamic threshold based on distance - farther objects need tighter aim
            var distanceFactor = Math.max(1, directionDistance / 1000);
            var adjustedThresholdSq = thresholdSq / distanceFactor;

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
