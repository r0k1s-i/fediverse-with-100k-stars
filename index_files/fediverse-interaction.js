var fediverseInteraction = {
    mouse: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    intersected: null,
    threshold: 100.0 
};

function initFediverseInteraction() {
    document.addEventListener('mousemove', onFediverseMouseMove, false);
    document.addEventListener('click', onFediverseClick, false);
}

function onFediverseMouseMove(event) {
    if (!enableFediverse) return;
    
    fediverseInteraction.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    fediverseInteraction.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    var vector = new THREE.Vector3(fediverseInteraction.mouse.x, fediverseInteraction.mouse.y, 1);
    projector.unprojectVector(vector, camera);
    
    fediverseInteraction.raycaster.set(camera.position, vector.sub(camera.position).normalize());

    var intersects = fediverseInteraction.raycaster.intersectObjects(fediverseMeshes, true);
    
    if (intersects.length > 0) {
        for (var i = 0; i < intersects.length; i++) {
            if (intersects[i].object.visible) {
                 handleHover(intersects[i].object.parent);
                 return;
            }
        }
    }
    
    var closestDist = Infinity;
    var closestInstance = null;
    var ray = fediverseInteraction.raycaster.ray;
    
    var point = new THREE.Vector3();
    var diff = new THREE.Vector3();
    
    if (typeof fediverseInstances !== 'undefined') {
        for (var i = 0; i < fediverseInstances.length; i++) {
            var instance = fediverseInstances[i];
            
            if (!instance.position) continue;
            
            point.set(instance.position.x, instance.position.y, instance.position.z);
            
            diff.subVectors(point, ray.origin);
            var distSq = diff.cross(ray.direction).lengthSq();
            
            var directionDistance = diff.dot(ray.direction);
            
            if (directionDistance > 0 && distSq < fediverseInteraction.threshold * fediverseInteraction.threshold) {
                var distToCam = point.distanceToSquared(camera.position);
                if (distToCam < closestDist) {
                    closestDist = distToCam;
                    closestInstance = instance;
                }
            }
        }
    }
    
    if (closestInstance) {
        handleHover({
            name: closestInstance.domain,
            instanceData: closestInstance
        });
    } else {
        handleHover(null);
    }
}

function handleHover(object) {
    if (fediverseInteraction.intersected !== object) {
        fediverseInteraction.intersected = object;
        
        if (object) {
            $starName.html("<span>" + object.name + "</span>");
            $starName.show();
            document.body.style.cursor = 'pointer';
        } else {
            $starName.hide();
            document.body.style.cursor = 'default';
        }
    }
    
    if (object && $starName.is(':visible')) {
        $starName.css({
            left: (fediverseInteraction.mouse.x + 1) / 2 * window.innerWidth + 15,
            top: -(fediverseInteraction.mouse.y - 1) / 2 * window.innerHeight + 15
        });
    }
}

function onFediverseClick(event) {
    if (fediverseInteraction.intersected) {
        var data = fediverseInteraction.intersected.instanceData || fediverseInteraction.intersected;
        showInstanceDetails(data);
    }
}

function showInstanceDetails(data) {
    var $title = $('#detailTitle span');
    var $body = $('#detailBody');
    
    $title.text(data.domain);
    
    var html = '<div style="margin-top: 20px;">';
    html += '<p><strong>Software:</strong> ' + (data.software ? data.software.name : 'Unknown') + '</p>';
    
    if (data.stats) {
        html += '<p><strong>Total Users:</strong> ' + numberWithCommas(data.stats.user_count) + '</p>';
        html += '<p><strong>Monthly Active Users:</strong> ' + numberWithCommas(data.stats.monthly_active_users) + '</p>';
    }
    
    if (data.first_seen_at) {
        html += '<p><strong>First Seen:</strong> ' + new Date(data.first_seen_at).toLocaleDateString() + '</p>';
    }
    
    if (data.description) {
        html += '<p style="margin-top:10px; font-style: italic;">' + data.description + '</p>';
    }
    
    html += '</div>';
    
    $body.html(html);
    
    $detailContainer.fadeIn();
    $('#css-container').css('display', 'none');
}

$(document).ready(function() {
    initFediverseInteraction();
});
