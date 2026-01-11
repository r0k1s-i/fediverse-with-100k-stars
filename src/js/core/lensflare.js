import * as THREE from "three";
import { Lensflare, LensflareElement } from "three/addons/objects/Lensflare.js";
import { constrain } from "../utils/math.js";
import { setLoadMessage as importedSetLoadMessage } from "../utils/dom.js";

var setLoadMessage = importedSetLoadMessage;
if (typeof setLoadMessage !== "function") {
  if (typeof window.setLoadMessage === "function") {
    setLoadMessage = window.setLoadMessage;
  } else {
    setLoadMessage = function (msg) {
      console.log(msg);
    };
  }
}

var textureLoader = new THREE.TextureLoader();

function onTextureError(err) {
  console.error("Error loading texture:", err);
}

var textureFlare0 = textureLoader.load(
  "src/assets/textures/lensflare0.png",
  undefined,
  undefined,
  onTextureError,
);
var textureFlare1 = textureLoader.load(
  "src/assets/textures/lensflare1.png",
  undefined,
  undefined,
  onTextureError,
);
var textureFlare2 = textureLoader.load(
  "src/assets/textures/lensflare2.png",
  undefined,
  undefined,
  onTextureError,
);

setLoadMessage("Calibrating optics");
var textureFlare3 = textureLoader.load(
  "src/assets/textures/lensflare3.png",
  undefined,
  undefined,
  onTextureError,
);

export function addLensFlare(x, y, z, size, overrideImage) {
  var lensFlare;
  var flareColor = new THREE.Color(0xffffff);
  flareColor.offsetHSL(0.08, 0.5, 0.5);

  lensFlare = new Lensflare();

  lensFlare.addElement(
    new LensflareElement(
      overrideImage ? overrideImage : textureFlare0,
      700,
      0.0,
      flareColor,
    ),
  );

  lensFlare.addElement(new LensflareElement(textureFlare1, 4096, 0.0));
  lensFlare.addElement(new LensflareElement(textureFlare2, 512, 0.0));
  lensFlare.addElement(new LensflareElement(textureFlare2, 512, 0.0));
  lensFlare.addElement(new LensflareElement(textureFlare2, 512, 0.0));

  lensFlare.customUpdateCallback = lensFlareUpdateCallback;
  lensFlare.position.set(x, y, z);

  lensFlare.userData = { size: size ? size : 16000 };

  return lensFlare;
}

export function addStarLensFlare(x, y, z, size, overrideImage, hueShift) {
  var gradientCanvas = window.gradientCanvas;
  var lensFlare;
  var flareColor = new THREE.Color(0xffffff);

  hueShift = 1.0 - hueShift;
  hueShift = constrain(hueShift, 0.0, 1.0);

  var lookupColor = gradientCanvas.getColor(hueShift);
  flareColor.setRGB(
    lookupColor[0] / 255,
    lookupColor[1] / 255,
    lookupColor[2] / 255,
  );

  var brightnessCalibration =
    1.25 -
    (Math.sqrt(
      Math.pow(lookupColor[0], 2) +
        Math.pow(lookupColor[1], 2) +
        Math.pow(lookupColor[2], 2),
    ) /
      255) *
      1.25;

  flareColor.offsetHSL(0.0, -0.15, brightnessCalibration);

  lensFlare = new Lensflare();

  lensFlare.addElement(
    new LensflareElement(
      overrideImage ? overrideImage : textureFlare0,
      700,
      0.0,
      flareColor,
    ),
  );

  lensFlare.customUpdateCallback = lensFlareUpdateCallback;
  lensFlare.position.set(x, y, z);

  lensFlare.userData = { size: size ? size : 16000 };

  lensFlare.addElement(new LensflareElement(textureFlare1, 512, 0.0));
  lensFlare.addElement(new LensflareElement(textureFlare3, 40, 0.6));
  lensFlare.addElement(new LensflareElement(textureFlare3, 80, 0.7));
  lensFlare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
  lensFlare.addElement(new LensflareElement(textureFlare3, 60, 1.0));

  return lensFlare;
}

function lensFlareUpdateCallback(object) {
  var camera = window.camera;
  var pSystem = window.pSystem;

  var lensFlare = this;
  var size = lensFlare.userData.size;

  var camDistance = camera.position.length();

  var mat = pSystem ? pSystem.shaderMaterial || pSystem.material : null;
  var heatVisionValue =
    mat && mat.uniforms ? mat.uniforms.heatVision.value : 0.0;

  if (!lensFlare.elements || !lensFlare.elements.length) return;

  for (var i = 0; i < lensFlare.elements.length; i++) {
    var element = lensFlare.elements[i];

    var scale = size / camDistance;

    if (!element.originalColor) element.originalColor = element.color.clone();

    var targetOpacity = 1.0 - heatVisionValue;

    if (camDistance < 10.0) {
      targetOpacity *= Math.pow(camDistance * 2.0, 2.0);
    }

    element.color.copy(element.originalColor);
    element.color.multiplyScalar(targetOpacity);
  }
}

var _origAddLensFlare = addLensFlare;
addLensFlare = function (x, y, z, size, overrideImage) {
  var lf = _origAddLensFlare(x, y, z, size, overrideImage);
  lf.update = lensFlareUpdateCallback;
  return lf;
};

var _origAddStarLensFlare = addStarLensFlare;
addStarLensFlare = function (x, y, z, size, overrideImage, hueShift) {
  var lf = _origAddStarLensFlare(x, y, z, size, overrideImage, hueShift);
  lf.update = lensFlareUpdateCallback;
  return lf;
};

window.addLensFlare = addLensFlare;
window.addStarLensFlare = addStarLensFlare;
