
import { AUToLY, KMToLY } from '../utils/app.js';

export function centerOn(vec3){
    var translating = window.translating;
    var updateMinimap = window.updateMinimap;
    
	var target = vec3.clone().negate();
	translating.easePanning = new TWEEN.Tween(translating.position)
      .to({
        x: target.x,
        y: target.y,
        z: target.z,
      }, 2200)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .start()
      .onComplete(function() {
      	translating.easePanning = undefined;
      });

	translating.targetPosition.copy( target );
	if(updateMinimap) updateMinimap();
}

export function snapTo(vec3){
    var translating = window.translating;
    var updateMinimap = window.updateMinimap;

	translating.targetPosition.copy( vec3.clone().negate() );
	translating.position.copy( vec3.clone().negate() );
	if(updateMinimap) updateMinimap();
}

export function zoomIn(v) {
    var camera = window.camera;
    var updateMinimap = window.updateMinimap;

	camera.easeZooming = new TWEEN.Tween(camera.position)
      .to({
        z: v
      }, 3000)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .start()
      .onComplete(function() {
      	camera.easeZooming = undefined;
      });

	camera.position.target.pz = camera.position.z;
	camera.position.target.z = v;
	if(updateMinimap) updateMinimap();
}

export function zoomOut(v) {
    var camera = window.camera;
    var updateMinimap = window.updateMinimap;

	camera.position.target.z = v || camera.position.target.pz;
	if(updateMinimap) updateMinimap();
}

export function centerOnSun() {
    var markers = window.markers;
	if(markers && markers[0]) markers[0].select();
}

export function EquatorialToGalactic( ra, dec ){
	var g_psi = 0.57477043300;
	var sTheta = 0.88998808748;
	var ctheta = 0.45598377618;
	var g_phi = 4.9368292465;

	var a = ra - g_phi;

	var sb = Math.sin( dec );
	var cb = Math.cos( dec );
	var cbsa = cb * Math.sin( a );

	var b = -1.0 * sTheta * cbsa + ctheta * sb;
	if( b > 1.0 )
		b = 1.0;

	var bo = Math.asin( b );

	a = Math.atan2( ctheta * cbsa + sTheta * sb, cb * Math.cos(a) );
	var ao = (a + g_psi + 4.0 * Math.PI );

	while( ao > Math.TWO_PI )
		ao -= Math.TWO_PI;

	var gal_lon = ao;
	if( gal_lon < 0.0 )
		gal_lon += Math.TWO_PI;
	if( gal_lon > Math.TWO_PI )
		gal_lon -= Math.TWO_PI;

	var gal_lat = bo;

	return {
		lat: gal_lat,
		lon: gal_lon
	};

}

window.centerOn = centerOn;
window.snapTo = snapTo;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.centerOnSun = centerOnSun;
window.EquatorialToGalactic = EquatorialToGalactic;
