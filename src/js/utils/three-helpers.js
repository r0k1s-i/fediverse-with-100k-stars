
export function toTHREEColor( colorString ){
	return new THREE.Color( parseInt( colorString.substr(1) , 16)  );
}

if (typeof THREE !== 'undefined' && THREE.Curve && THREE.Curve.Utils) {
	THREE.Curve.Utils.createLineGeometry = function( points ) {
		var geometry = new THREE.BufferGeometry().setFromPoints( points );
		return geometry;
	};
}

export function getAbsOrigin( object3D ){
	var mat = object3D.matrixWorld;
	var worldpos = new THREE.Vector3();
	worldpos.setFromMatrixPosition(mat);
	return worldpos;
}

export function screenXY(object){	
  var vector = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
  vector.project(camera);

	var result = new Object();
    var windowWidth = window.innerWidth;
    var minWidth = 1280;
    if(windowWidth < minWidth) {
        windowWidth = minWidth;
    }
	result.x = Math.round( vector.x * (windowWidth/2) ) + windowWidth/2;
	result.y = Math.round( (0-vector.y) * (window.innerHeight/2) ) + window.innerHeight/2;
	return result;
}	

export function buildHexColumnGeo(rad, height){
	var points = [];
	var ang = 0;
	var sixth = 2*Math.PI / 6;
	for(var i=0; i<7; i++){					
		var x = Math.cos(ang) * rad;
		var y = -Math.sin(ang) * rad;
		points.push( new THREE.Vector2(x,y) );
		ang += sixth;
	}
	var shape = new THREE.Shape(points);

	var options = {
		size: 			0,
		depth: 		height,
		steps: 			1,
		bevelEnabled:  	false,
	};
	var extrudedGeo = new THREE.ExtrudeGeometry(shape, options);
	return extrudedGeo;	    	
}

window.toTHREEColor = toTHREEColor;
window.getAbsOrigin = getAbsOrigin;
window.screenXY = screenXY;
window.buildHexColumnGeo = buildHexColumnGeo;
