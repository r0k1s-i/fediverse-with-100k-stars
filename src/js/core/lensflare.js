
import { constrain } from '../utils/math.js';

var textureLoader = new THREE.TextureLoader();

function onTextureError(err) {
  console.error("Error loading texture:", err);
}

var textureFlare0 = textureLoader.load( "src/assets/textures/lensflare0.png", undefined, undefined, onTextureError );
var textureFlare1 = textureLoader.load( "src/assets/textures/lensflare1.png", undefined, undefined, onTextureError );
var textureFlare2 = textureLoader.load( "src/assets/textures/lensflare2.png", undefined, undefined, onTextureError );
setLoadMessage("Calibrating optics");
var textureFlare3 = textureLoader.load( "src/assets/textures/lensflare3.png", undefined, undefined, onTextureError );

export function addLensFlare(x,y,z, size, overrideImage){
	var lensFlare;
    var flareColor = new THREE.Color( 0xffffff );
	flareColor.offsetHSL( 0.08, 0.5, 0.5 );

	lensFlare = new THREE.LensFlare( overrideImage ? overrideImage : textureFlare0, 700, 0.0, THREE.AdditiveBlending, flareColor );

	lensFlare.add( textureFlare1, 4096, 0.0, THREE.AdditiveBlending );
	lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
	lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
	lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );

	lensFlare.customUpdateCallback = lensFlareUpdateCallback;
	lensFlare.position.set(x,y,z);
	lensFlare.size = size ? size : 16000 ;
	return lensFlare;
}

export function addStarLensFlare(x,y,z, size, overrideImage, hueShift){
    var gradientCanvas = window.gradientCanvas;
	var lensFlare;
    var flareColor = new THREE.Color( 0xffffff );

	hueShift = 1.0 - hueShift;
	hueShift = constrain( hueShift, 0.0, 1.0 );

	var lookupColor = gradientCanvas.getColor( hueShift );
	flareColor.setRGB( lookupColor[0]/255, lookupColor[1]/255, lookupColor[2]/255 );

	var brightnessCalibration = 1.25 - Math.sqrt( Math.pow(lookupColor[0],2) + Math.pow(lookupColor[1],2) + Math.pow(lookupColor[2],2) )/255 * 1.25;	

	flareColor.offsetHSL(0.0, -0.15, brightnessCalibration );

	lensFlare = new THREE.LensFlare( overrideImage ? overrideImage : textureFlare0, 700, 0.0, THREE.AdditiveBlending, flareColor );
	lensFlare.customUpdateCallback = lensFlareUpdateCallback;
	lensFlare.position.set(x,y,z);
	lensFlare.size = size ? size : 16000 ;

	lensFlare.add( textureFlare1, 512, 0.0, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 40, 0.6, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 80, 0.7, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 120, 0.9, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 60, 1.0, THREE.AdditiveBlending );	

	return lensFlare;
}

function lensFlareUpdateCallback( object ) {
    var camera = window.camera;
    var pSystem = window.pSystem;

    var f, fl = this.lensFlares.length;
    var flare;
    var vecX = -this.positionScreen.x * 2;
    var vecY = -this.positionScreen.y * 2;
    var size = object.size ? object.size : 16000;

    var camDistance = camera.position.length();

    var mat = pSystem ? (pSystem.shaderMaterial || pSystem.material) : null;
	var heatVisionValue = (mat && mat.uniforms) ? mat.uniforms.heatVision.value : 0.0;

    for( f = 0; f < fl; f ++ ) {

        flare = this.lensFlares[ f ];

        flare.x = this.positionScreen.x + vecX * flare.distance;
        flare.y = this.positionScreen.y + vecY * flare.distance;

        flare.scale = size / camDistance;
        flare.rotation = 0;
        flare.opacity = 1.0 - heatVisionValue;
    }
}

window.addLensFlare = addLensFlare;
window.addStarLensFlare = addStarLensFlare;
