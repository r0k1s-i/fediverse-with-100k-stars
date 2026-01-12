
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

export function goToGridView() {
    var camera = window.camera;
    var updateMinimap = window.updateMinimap;

    // gridPlane 在 z=300-1500 可见，800 为最佳观察距离
    var targetZ = 800;
    
    // 关键修正：
    // 1. rotateY = 0: 正对 XY 平面（三主星所在平面）
    // 2. rotateX = PI/3 (~60度): 大角度俯视，使垂直的 XY 平面在视觉上呈现为"向后倾斜的地面"，形成水平波纹效果
    var targetRotateX = Math.PI / 3;
    var targetRotateY = 0;

    var translating = window.translating;
    if (translating) {
        translating.easePanning = new TWEEN.Tween(translating.position)
            .to({ x: 0, y: 0, z: 0 }, 1500)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .start()
            .onComplete(function() {
                translating.easePanning = undefined;
            });
        translating.targetPosition.set(0, 0, 0);
    }

    camera.easeZooming = new TWEEN.Tween(camera.position)
        .to({ z: targetZ }, 2000)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .start()
        .onComplete(function() {
            camera.easeZooming = undefined;
        });

    camera.position.target.pz = camera.position.z;
    camera.position.target.z = targetZ;

    var currentRotateX = window.rotateX || 0;
    var currentRotateY = window.rotateY || 0;
    
    // 规范化角度到 -PI ~ PI 以确保最短路径旋转
    while (currentRotateY > Math.PI) currentRotateY -= Math.PI * 2;
    while (currentRotateY < -Math.PI) currentRotateY += Math.PI * 2;
    
    var startTime = Date.now();
    var duration = 2000;
    
    function animateRotation() {
        var elapsed = Date.now() - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var eased = -(Math.cos(Math.PI * progress) - 1) / 2;
        
        window.rotateX = currentRotateX + (targetRotateX - currentRotateX) * eased;
        window.rotateY = currentRotateY + (targetRotateY - currentRotateY) * eased;
        
        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        }
    }
    animateRotation();

    window.initialAutoRotate = false;

    if (updateMinimap) updateMinimap();
}

window.centerOn = centerOn;
window.snapTo = snapTo;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.centerOnSun = centerOnSun;
window.EquatorialToGalactic = EquatorialToGalactic;
window.goToGridView = goToGridView;
