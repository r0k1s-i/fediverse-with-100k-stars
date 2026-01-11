
import { KMToLY } from '../utils/app.js';
import { random } from '../utils/math.js';
import { Gyroscope } from './Gyroscope.js';

function makeOortCloud(){
	var count = 10000;
	var dist = 0.790642941;
	var distrib = 0.1;

	var particlesGeo = new THREE.BufferGeometry();
    var positions = new Float32Array( count * 3 );

	var vector = new THREE.Vector3();

	for( var i=0; i<positions.length; i+=3 ){
		vector.x = random(-1,1);
		vector.y = random(-1,1);
		vector.z = random(-1,1);
		vector.setLength( dist );

		var multDistr = distrib;
		if( Math.random() > 0.98 )
			multDistr = Math.pow( multDistr, 1 + Math.random() * 6)

		vector.x += random(-multDistr,multDistr);
		vector.y += random(-multDistr,multDistr);
		vector.z += random(-multDistr,multDistr);
		positions[i] = vector.x;
		positions[i+1] = vector.y;
		positions[i+2] = vector.z;
	}
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	particlesGeo.computeBoundingSphere();

	var material = new THREE.PointsMaterial({color:0x333333, size: 0.1});
	var particles = new THREE.Points( particlesGeo, material );

	var oortInfo = new Gyroscope();
	oortInfo.name = "Oort Cloud";
	oortInfo.position.set( dist, -dist , 0 );
	oortInfo.scale.setLength( 0.1 );
	attachLegacyMarker( "Oort Cloud", oortInfo, 1.0, {min:40.0, max: 500.0}  );

	particles.add( oortInfo );

	return particles;
}

function makeKuiperBelt(){
	var dist = 0.000632514353;
}

function makeSolarSystem(){
	var solarSystem = new THREE.Object3D();

	var oortCloud = makeOortCloud();
	solarSystem.add( oortCloud );

	var mercuryOrbit = createSpaceRadius( KMToLY(55000000), 0xffffff );
	solarSystem.add( mercuryOrbit );
	var mercury = createPlanet( 55000000, 2439.7 );
	solarSystem.add( mercury );
	attachLegacyMarker( "Mercury", mercury, 1.0, {min:3.4, max: 8.0} );	

	var venusOrbit = createSpaceRadius( KMToLY(108000000), 0xffffff );
	solarSystem.add( venusOrbit );
	var venus = createPlanet( 108000000, 6051.8 );
	solarSystem.add( venus );
	attachLegacyMarker( "Venus", venus, 1.0, {min:3.6, max: 8.2} );	

	var earthOrbit = createSpaceRadius( KMToLY(150000000), 0xffffff );
	solarSystem.add( earthOrbit );

	var earth = createPlanet( 150000000, 6378.1 );
	solarSystem.add( earth );

	earth.name = "Earth";
	attachLegacyMarker( "Earth", earth, 1.0, {min:3.8, max: 8.4} );

	earth.add( createSpaceRadius( KMToLY(402652), 0xffffff, 16.0 ) );

	solarSystem.add( createSpaceRadius( KMToLY(230000000), 0xffffff ) );	
	var mars = createPlanet( 230000000, 3396.2 );
	solarSystem.add( mars );
	attachLegacyMarker( "Mars", mars, 1.0, {min:4.0, max: 8.6} );

	solarSystem.add( createSpaceRadius( KMToLY(778000000), 0xffffff ) );
	var jupiter = createPlanet( 778000000, 71492.2 );
	solarSystem.add( jupiter );
	attachLegacyMarker( "Jupiter", jupiter, 1.0, {min:8.0, max: 17.2} );

	solarSystem.add( createSpaceRadius( KMToLY(1400000000), 0xffffff ) );
	var saturn = createPlanet( 1400000000, 60268 );
	solarSystem.add( saturn );
	attachLegacyMarker( "Saturn", saturn, 1.0, {min:8.0, max: 17.6} );

	solarSystem.add( createSpaceRadius( KMToLY(3000000000), 0xffffff ) );
	var uranus = createPlanet( 3000000000, 25559 );
	solarSystem.add( uranus );
	attachLegacyMarker( "Uranus", uranus, 1.0, {min:8.0, max: 18.0} );

	solarSystem.add( createSpaceRadius( KMToLY(4500000000), 0xffffff ) );
	var neptune = createPlanet( 4500000000, 24764  );
	solarSystem.add( neptune );
	attachLegacyMarker( "Neptune", neptune, 1.0, {min:8.0, max: 20.0} );

	solarSystem.dynamic = true;

	var measurement = createDistanceMeasurement( new THREE.Vector3( 0,0,0 ), new THREE.Vector3( 1,0,0 ) );
	measurement.position.y = 0.08;
	measurement.update = function(){
		if( camera.position.z > 120 && camera.position.z < 400 ){
			this.visible = true;
		}
		else{
			this.visible = false;
		}
	}
	measurement.visible = true;
	var sub = new THREE.Object3D();
	sub.position.x = 0.5;
	sub.position.y = 0.08;
	measurement.add( sub );
	attachLegacyMarker( "One light year.", sub, 1.0, {min:120, max: 400} );
	solarSystem.add( measurement );	

	oortCloud.update = function(){
		if( camera.position.z > 40 && camera.position.z < 600 )
			this.visible = true;
		else
			this.visible = false;
	}

	return solarSystem;
}

function createPlanet( distanceToSunKM, radiusKM ){
	var planetGeo = new THREE.SphereGeometry( KMToLY( radiusKM ), 12, 8 );
	var planet = new THREE.Mesh( planetGeo );
	planet.position.x = KMToLY(distanceToSunKM);
	return planet;	
}
