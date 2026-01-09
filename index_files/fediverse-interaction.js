var fediverseInteraction = {
    mouse: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    intersected: null,
    baseThreshold: 100.0,
    clickHandled: false,
    lastClickTime: 0
};

function getInteractionThreshold() {
    if (typeof camera === 'undefined') return fediverseInteraction.baseThreshold;
    var z = camera.position.z;
    // Reduced from 0.15 to 0.025 to prevent "black hole" effect at origin when zoomed out
    // 0.025 corresponds to roughly 3% of screen height (approx 30px on 1080p)
    return Math.max(fediverseInteraction.baseThreshold, z * 0.025);
}

function initFediverseInteraction() {
    if (typeof camera === 'undefined') {
        setTimeout(initFediverseInteraction, 500);
        return;
    }
    
    document.addEventListener('mousemove', onFediverseMouseMove, false);
    document.addEventListener('click', onFediverseClick, true);
}

function onFediverseMouseMove(event) {
    if (!enableFediverse) return;
    if (typeof camera === 'undefined') return;
    
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
    
    var closestInstance = null;
    
    if (typeof fediverseInstances !== 'undefined' && typeof InteractionMath !== 'undefined') {
        closestInstance = InteractionMath.findClosestInstance(
            fediverseInteraction.raycaster.ray.origin,
            fediverseInteraction.raycaster.ray.direction,
            fediverseInstances,
            getInteractionThreshold()
        );
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
            $starName.css('opacity', 1.0).show();
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

function isClickOnUI(event) {
    var target = event.target;
    while (target && target !== document.body) {
        var id = target.id || '';
        var className = target.className || '';
        if (id === 'detailContainer' || 
            id === 'detailTitle' ||
            id === 'detailBody' ||
            id === 'detailClose' ||
            id === 'ex-out' || 
            id === 'zoom-back' ||
            id === 'icon-nav' ||
            id === 'css-container' ||
            id === 'css-camera' ||
            id === 'minimap' ||
            id === 'about' ||
            className.indexOf('marker') !== -1 ||
            className.indexOf('legacy-marker') !== -1) {
            return true;
        }
        target = target.parentNode;
    }
    return false;
}

function onFediverseClick(event) {
    if (!enableFediverse) return;
    
    if (isClickOnUI(event)) return;
    
    var now = Date.now();
    if (now - fediverseInteraction.lastClickTime < 300) return;
    fediverseInteraction.lastClickTime = now;
    
    if (!fediverseInteraction.intersected) return;
    
    event.stopPropagation();
    event.preventDefault();
    
    var data = fediverseInteraction.intersected.instanceData || fediverseInteraction.intersected;
    if (!data || !data.position) return;
    
    var position = new THREE.Vector3(
        data.position.x,
        data.position.y,
        data.position.z
    );
    
    if (position.length() > 0.001) {
        if (typeof window.showSunButton === 'function') {
            window.showSunButton();
        }
    } else {
        if (typeof window.hideSunButton === 'function') {
            window.hideSunButton();
        }
    }
    
    if (typeof window.setMinimap === 'function') {
        window.setMinimap(true);
    }
    
    var userCount = data.stats ? data.stats.user_count : 1;
    var instanceSize = Math.max(15.0, Math.log(userCount + 1) * 8);
    
    var MIN_STAR_SCALE = 0.5;
    var modelScale = Math.max(MIN_STAR_SCALE, instanceSize * 0.05);
    var zoomLevel = modelScale * 3.0;
    
    if (typeof starModel !== 'undefined' && typeof enableStarModel !== 'undefined' && enableStarModel) {
        starModel.position.copy(position);
        
        var spectralIndex = 0.5;
        if (data.color && data.color.hsl) {
            spectralIndex = data.color.hsl.h / 360;
        }
        starModel.setSpectralIndex(spectralIndex);
        starModel.setScale(modelScale);
        starModel.randomizeSolarFlare();
    }
    
    var offset = new THREE.Vector3(0, 0, 0);
    if (typeof getOffsetByStarRadius === 'function') {
        offset = getOffsetByStarRadius(modelScale);
    }
    var targetPosition = position.clone().add(offset);
    
    if (typeof centerOn === 'function') {
        centerOn(targetPosition);
    }
    
    if (typeof zoomIn === 'function') {
        zoomIn(zoomLevel);
    }
    
    $starName.find('span').html(data.domain);
    
    showInstanceDetails(data);
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
