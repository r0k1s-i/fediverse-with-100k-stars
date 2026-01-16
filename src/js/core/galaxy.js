import * as THREE from "three";
import { constrain, random } from "../utils/math.js";
import { AssetManager } from "./asset-manager.js";
import { VISIBILITY } from "./constants.js";

var textureLoader = AssetManager.getInstance();

function onTextureError(err) {
  console.error("Error loading texture:", err);
}

var galacticTexture0 = textureLoader.loadTexture(
  "src/assets/textures/galactic_sharp.png",
  undefined,
  undefined,
  onTextureError,
);
var galacticTexture1 = textureLoader.loadTexture(
  "src/assets/textures/galactic_blur.png",
  undefined,
  undefined,
  onTextureError,
);

var galacticUniforms = {
  color: { value: new THREE.Color(0xffffff) },
  texture0: { value: galacticTexture0 },
  texture1: { value: galacticTexture1 },
  idealDepth: { value: 1.0 },
  blurPower: { value: 1.0 },
  blurDivisor: { value: 2.0 },
  sceneSize: { value: 120.0 },
  cameraDistance: { value: 800.0 },
  zoomSize: { value: 1.0 },
  scale: { value: 1.0 },
  heatVision: { value: 0.0 },
};

export function generateGalaxy() {
  var shaderList = window.shaderList;
  var addLensFlare = window.addLensFlare;
  var createDistanceMeasurement = window.createDistanceMeasurement;
  var attachLegacyMarker = window.attachLegacyMarker;
  var glowSpanTexture = window.glowSpanTexture;
  var camera = window.camera;
  var galacticCentering = window.galacticCentering;
  var pSystem = window.pSystem;
  var pDustSystem = window.pDustSystem;
  var maxAniso = window.maxAniso || 1;

  setLoadMessage("Generating the galaxy");

  var geometry = new THREE.BufferGeometry();
  var count = 100000;

  var positions = new Float32Array(count * 3);
  var colors = new Float32Array(count * 3);
  var sizes = new Float32Array(count);

  var numArms = 5;
  var arm = 0;
  var countPerArm = count / numArms;
  var ang = 0;
  var dist = 0;

  for (var i = 0; i < count; i++) {
    var x = Math.cos(ang) * dist;
    var y = 0;
    var z = Math.sin(ang) * dist;

    var scatterAmount = 100 - Math.sqrt(dist);
    if (Math.random() > 0.3) scatterAmount *= (1 + Math.random()) * 4;
    x += random(-scatterAmount, scatterAmount);
    z += random(-scatterAmount, scatterAmount);

    var distanceToCenter = Math.sqrt(x * x + z * z);
    var thickness =
      constrain(
        Math.pow(constrain(90 - distanceToCenter * 0.1, 0, 100000), 2) * 0.02,
        2,
        10000,
      ) +
      Math.random() * 120;
    y += random(-thickness, thickness);

    x *= 20;
    y *= 20;
    z *= 20;

    var size = 200 + constrain(600 / dist, 0, 32000);
    if (Math.random() > 0.99)
      size *= Math.pow(1 + Math.random(), 3 + Math.random() * 3) * 0.9;
    else if (Math.random() > 0.7)
      size *= 1 + Math.pow(1 + Math.random(), 2) * 0.04;

    if (i == 0) {
      size = 100000;
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    sizes[i] = size;

    var r =
      constrain(1 - Math.pow(dist, 3) * 0.00000002, 0.3, 1) + random(-0.1, 0.1);
    var g =
      constrain(0.7 - Math.pow(dist, 2) * 0.000001, 0.41, 1) +
      random(-0.1, 0.1);
    var b = constrain(0.1 + dist * 0.004, 0.3, 0.6) + random(-0.1, 0.1);

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;

    ang += 0.0002;
    dist += 0.08;

    if (i % countPerArm == 0) {
      ang = ((Math.PI * 2) / numArms) * arm;
      dist = 0;
      arm++;
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  var galacticShaderMaterial = new THREE.ShaderMaterial({
    uniforms: galacticUniforms,
    vertexShader: shaderList.galacticstars.vertex,
    fragmentShader: shaderList.galacticstars.fragment,

    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.0,
  });

  var pGalacticSystem = new THREE.Points(geometry, galacticShaderMaterial);

  pGalacticSystem.position.x = 27000;

  pGalacticSystem.add(addLensFlare(0, 0, 0));

  var galacticTopMaterial = new THREE.MeshBasicMaterial({
    map: textureLoader.loadTexture(
      "src/assets/textures/galactictop.png",
      undefined,
      undefined,
      onTextureError,
    ),
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });

  var plane = new THREE.Mesh(
    new THREE.PlaneGeometry(150000, 150000, 30, 30),
    galacticTopMaterial,
  );
  plane.rotation.x = Math.PI / 2;
  plane.material.map.anisotropy = maxAniso;
  pGalacticSystem.add(plane);

  var measurement = createDistanceMeasurement(
    new THREE.Vector3(0, 0, -55000),
    new THREE.Vector3(0, 0, 55000),
  );
  measurement.position.y = -1000;
  measurement.visible = false;
  attachLegacyMarker("Milky Way ~110,000 Light Years", measurement, 1.0, {
    min: 6000,
    max: 120000,
  });
  pGalacticSystem.add(measurement);
  measurement.rotation.x = Math.PI;

  pGalacticSystem.measurement = measurement;
  window.toggleGalacticMeasurement = function (desired) {
    if (desired == undefined)
      pGalacticSystem.measurement.visible = !this.measurement.visible;
    else pGalacticSystem.measurement.visible = desired;
  };

  var cylinderMaterial = new THREE.MeshBasicMaterial({
    map: glowSpanTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    wireframe: true,
    opacity: 1.0,
  });
  var isogeo = new THREE.IcosahedronGeometry(40000, 4);
  var matrix = new THREE.Matrix4();
  matrix.scale(new THREE.Vector3(1, 0, 1));
  isogeo.applyMatrix4(matrix);
  var isoball = new THREE.Mesh(isogeo, cylinderMaterial);
  isoball.material.map.wrapS = THREE.RepeatWrapping;
  isoball.material.map.wrapT = THREE.RepeatWrapping;
  isoball.material.map.needsUpdate = true;
  isoball.update = function () {
    var mat = pSystem ? pSystem.shaderMaterial || pSystem.material : null;
    var heatVisionValue =
      mat && mat.uniforms ? mat.uniforms.heatVision.value : 0;
  };
  isoball.material.map.onUpdate = function () {
    this.offset.y -= 0.0001;
    this.needsUpdate = true;
  };

  pGalacticSystem.update = function () {
    camera = window.camera;
    pSystem = window.pSystem;
    pDustSystem = window.pDustSystem;

    galacticUniforms.zoomSize.value = 1.0 + 10000 / camera.position.z;

    var areaOfWindow = window.innerWidth * window.innerHeight;

    galacticUniforms.scale.value = Math.sqrt(areaOfWindow) * 1.5;

    galacticTopMaterial.opacity = galacticShaderMaterial.opacity;

    if (pSystem) {
      var mat = pSystem.shaderMaterial || pSystem.material;
      if (mat && mat.uniforms && mat.uniforms.heatVision) {
        var heatVisionValue = mat.uniforms.heatVision.value;

        if (heatVisionValue > 0) {
          galacticTopMaterial.opacity = 1.0 - heatVisionValue;
        }

        galacticUniforms.heatVision.value = heatVisionValue;

        if (pDustSystem) {
          if (heatVisionValue > 0) pDustSystem.visible = false;
          else pDustSystem.visible = true;
        }
      }
    }

    if (camera.position.z < VISIBILITY.GALAXY.HIDE_Z) {
      if (galacticShaderMaterial.opacity > 0)
        galacticShaderMaterial.opacity -= 0.05;
    } else {
      if (galacticShaderMaterial.opacity < 1)
        galacticShaderMaterial.opacity += 0.05;
    }

    if (galacticShaderMaterial.opacity <= 0.0) {
      pGalacticSystem.visible = false;
      plane.visible = false;
    } else {
      pGalacticSystem.visible = true;
      // 只有当贴图透明度大于 0.01 时才显示，避免热图模式下的残留
      plane.visible = galacticTopMaterial.opacity > 0.01;
    }

    var targetLerp = constrain(
      Math.pow(camera.position.z / 80000, 3),
      0.0,
      1.0,
    );
    if (targetLerp < 0.00001) targetLerp = 0.0;

    galacticCentering.position.set(0, 0, 0);
    galacticCentering.position.lerp(this.position.clone().negate(), targetLerp);
  };

  pGalacticSystem.position.x = 11404;
  pGalacticSystem.position.y = 14000;
  pGalacticSystem.position.z = 10000;

  pGalacticSystem.rotation.x = 2.775557;
  pGalacticSystem.rotation.y = -0.4;
  pGalacticSystem.rotation.z = -1.099999;

  return pGalacticSystem;
}

window.generateGalaxy = generateGalaxy;
