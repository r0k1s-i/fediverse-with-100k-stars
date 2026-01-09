var fediverseLabels = {
    canvas: null,
    ctx: null,
    layout: null,
    sortedInstances: [],
    maxLabels: 300,
    checkCount: 2000,
    font: '12px "Segoe UI", Arial, sans-serif'
};

function initFediverseLabels() {
    if (!enableFediverse) return;

    if (typeof fediverseInstances === 'undefined') {
        setTimeout(initFediverseLabels, 500);
        return;
    }

    var container = document.getElementById('visualization');
    var canvas = document.createElement('canvas');
    canvas.id = 'label-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.zIndex = '999';
    
    container.appendChild(canvas);
    
    fediverseLabels.canvas = canvas;
    fediverseLabels.ctx = canvas.getContext('2d');
    fediverseLabels.layout = new LabelLayout();

    fediverseLabels.sortedInstances = fediverseInstances.slice().sort(function(a, b) {
        var usersA = (a.stats && a.stats.user_count) ? a.stats.user_count : 0;
        var usersB = (b.stats && b.stats.user_count) ? b.stats.user_count : 0;
        return usersB - usersA;
    });
    
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

function updateFediverseLabels() {
    if (!fediverseLabels.canvas) return;
    
    var ctx = fediverseLabels.ctx;
    var width = fediverseLabels.canvas.width;
    var height = fediverseLabels.canvas.height;
    
    ctx.clearRect(0, 0, width, height);

    var candidates = [];
    var vector = new THREE.Vector3();
    
    var limit = Math.min(fediverseLabels.sortedInstances.length, fediverseLabels.checkCount);
    
    for (var i = 0; i < limit; i++) {
        var inst = fediverseLabels.sortedInstances[i];
        
        vector.set(inst.position.x, inst.position.y, inst.position.z);
        
        projector.projectVector(vector, camera);
        
        if (vector.x > -0.9 && vector.x < 0.9 && vector.y > -0.9 && vector.y < 0.9 && vector.z < 1.0 && vector.z > 0.0) {
            
            var sx = (vector.x * width / 2) + width / 2;
            var sy = -(vector.y * height / 2) + height / 2;
            
            var priority = limit - i;
            
            var name = inst.domain;
            var textWidth = ctx.measureText(name).width;
            var textHeight = 14;
            
            candidates.push({
                id: inst.domain,
                text: name,
                x: sx - textWidth / 2,
                y: sy - textHeight / 2,
                width: textWidth,
                height: textHeight,
                priority: priority,
                inst: inst
            });
        }
    }
    
    var visibleLabels = fediverseLabels.layout.process(candidates);
    
    ctx.font = fediverseLabels.font;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    var renderLimit = Math.min(visibleLabels.length, fediverseLabels.maxLabels);
    
    for (var j = 0; j < renderLimit; j++) {
        var label = visibleLabels[j];
        ctx.fillText(label.text, label.x, label.y);
    }
}
