
var textureLoader = new THREE.TextureLoader();

function onTextureError(err) {
  console.error("Error loading guide texture:", err);
}

export var guidePointTexture = textureLoader.load( "src/assets/textures/p_1.png", undefined, undefined, onTextureError );

export function createSpaceRadius( radius, color, representationScale ){
	color = color ? color : 0xffffff;
	representationScale = representationScale ? representationScale : 1;

	var width = Math.sqrt(radius) * 0.00001 * representationScale;
	var thickness = radius * 0.0005;
	var textureRepeat = 30;

	var resolution = 180;
	var twoPI = Math.PI * 2;
	var angPerRes = twoPI / resolution;	
	var verts = [];
	for( var i=0; i<twoPI; i+=angPerRes ){
		var x = Math.cos( i ) * radius;
		var y = Math.sin( i ) * radius;
		var v = new THREE.Vector3( x,y,0 );
		verts.push( v );
	}

	var geometry = new THREE.BufferGeometry().setFromPoints(verts);

	var areaOfWindow = window.innerWidth * window.innerHeight;

	var pointSize = 0.000004 * areaOfWindow;

	var particleMaterial = new THREE.PointsMaterial( 
		{
			color: color, 
			size: pointSize, 
			sizeAttenuation: false, 
			map: guidePointTexture,
			blending: THREE.AdditiveBlending,
			depthTest: false,
			depthWrite: false,
		} 
	);

	var mesh = new THREE.Points( geometry, particleMaterial );

	mesh.update = function(){
		if( camera.position.z < 2.0 )
			this.visible = false
		else
		if( camera.position.z < 800)
			this.visible = true;
		else
			this.visible = false;
	}
	
	mesh.rotation.x = Math.PI/2;
	return mesh;
}

export function createDistanceMeasurement( vecA, vecB ){
	var distance = vecA.distanceTo( vecB );
	var height = distance * 0.04;
	var bufferSpace = 0.38;

	var upwards = new THREE.Vector3( 0, 0, 0 );
	var downwards = new THREE.Vector3( 0, -height, 0 );
	var clamperA = vecA.clone().add( downwards );
	var clamperB = vecB.clone().add( downwards );
	vecA.add( upwards );
	vecB.add( upwards );	

	var center = vecA.clone().lerp( vecB, 0.5 );
	var vecAMargin = vecA.clone().lerp( vecB, bufferSpace );
	var vecBMargin = vecB.clone().lerp( vecA, bufferSpace );

    var points = [
        clamperA,
        vecA,
        vecAMargin,
        vecAMargin,
        vecBMargin,
        vecBMargin,
        vecB,
        clamperB
    ];

    var solid = new THREE.Color(0x888888);
	var nonsolid = new THREE.Color(0x000000);

    var colors = [
        solid,
        solid,
        solid,
        nonsolid,
        nonsolid,
        solid,
        solid,
        solid
    ];

    var geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    var colorArray = [];
    for(var i=0; i<colors.length; i++) {
        colorArray.push(colors[i].r, colors[i].g, colors[i].b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));

	var material = new THREE.LineBasicMaterial(
		{
			color: 0xffffff,
			depthTest: false,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			vertexColors: true,
		}
	);
	var mesh = new THREE.Line( geometry, material );	
	return mesh;
}

window.guidePointTexture = guidePointTexture;
window.createSpaceRadius = createSpaceRadius;
window.createDistanceMeasurement = createDistanceMeasurement;
