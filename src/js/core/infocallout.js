
import { KMToLY } from '../utils/app.js';

export function makeSunEarthDiagram(){
    var translating = window.translating;
    var attachMarker = window.attachMarker;

	var sunEarthDiagram = new THREE.Object3D();

	var distanceToEarth = KMToLY(150000000);
	var lineGeo = new THREE.BufferGeometry().setFromPoints([
		new THREE.Vector3(0,0,0),
		new THREE.Vector3(distanceToEarth,0,0)
	]);
	var line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({color:0xffffff}));
	sunEarthDiagram.add( line );	
	
	var earthGyro = new THREE.Gyroscope();
	earthGyro.position.x = distanceToEarth;	
	sunEarthDiagram.add( earthGyro );	
	var earthCallout = makeClamper(0.0000025);	
	earthGyro.add( earthCallout );

	earthGyro.name = "Sun";
	attachMarker( earthGyro, 0.001 );

	var sunGyro = new THREE.Gyroscope();
	sunEarthDiagram.add( sunGyro );
	var sunCallout = makeClamper(0.000003);
	sunGyro.add( sunCallout );
	
	translating.add(sunEarthDiagram);
}

var textureLoader = new THREE.TextureLoader();
var clamperTexture = textureLoader.load( 'src/assets/textures/clamper.png' );
var clamperMaterial = new THREE.MeshBasicMaterial({
	map: clamperTexture,
	depthTest: false,
	depthWrite: false,
	transparent: true,
	side: THREE.DoubleSide,
	blending: THREE.AdditiveBlending
});

function makeClamper( scale ){
    var maxAniso = window.maxAniso || 1;
	clamperTexture.anisotropy = maxAniso;
	var plane = new THREE.Mesh( new THREE.PlaneGeometry(1,1), clamperMaterial );
	plane.scale.setLength( scale );
	return plane;
}

export function displaySunEarthDiagram(){
}

export function highlightStarHeat(){
    var toggleHeatVision = window.toggleHeatVision;
	var seconds = 6.0;
	toggleHeatVision( true );
	setTimeout( function(){
		toggleHeatVision( false );
	}, seconds * 1000.0 )
}

export function highlightMilkyWay(){
    var toggleGalacticMeasurement = window.toggleGalacticMeasurement;
	var seconds = 6.0;
	toggleGalacticMeasurement( true );
	setTimeout( function(){
		toggleGalacticMeasurement( false );
	}, seconds * 1000.0 )	
}

window.makeSunEarthDiagram = makeSunEarthDiagram;
window.displaySunEarthDiagram = displaySunEarthDiagram;
window.highlightStarHeat = highlightStarHeat;
window.highlightMilkyWay = highlightMilkyWay;
