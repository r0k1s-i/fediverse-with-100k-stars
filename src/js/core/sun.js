import * as THREE from 'three';
import { constrain, map } from "../utils/math.js";
import { Gyroscope } from "./Gyroscope.js";

var sunTexture;
var sunColorLookupTexture;
var solarflareTexture;
var sunHaloTexture;
var sunHaloColorTexture;
var sunCoronaTexture;

var textureLoader = new THREE.TextureLoader();

function onTextureError(err) {
  console.error("Error loading texture:", err);
}

function loadStarSurfaceTextures() {
  if (sunTexture === undefined) {
    setLoadMessage("Igniting solar plasma");
    sunTexture = textureLoader.load(
      "src/assets/textures/sun_surface.png",
      undefined,
      undefined,
      onTextureError
    );
    sunTexture.anisotropy = maxAniso;
    sunTexture.wrapS = sunTexture.wrapT = THREE.RepeatWrapping;
  }

  if (sunColorLookupTexture === undefined) {
    sunColorLookupTexture = textureLoader.load(
      "src/assets/textures/star_colorshift.png",
      undefined,
      undefined,
      onTextureError
    );
  }

  if (solarflareTexture === undefined) {
    setLoadMessage("Distributing solar flares");
    solarflareTexture = textureLoader.load(
      "src/assets/textures/solarflare.png",
      undefined,
      undefined,
      onTextureError
    );
  }

  if (sunHaloTexture === undefined) {
    setLoadMessage("Calculating coronal mass");
    sunHaloTexture = textureLoader.load(
      "src/assets/textures/sun_halo.png",
      undefined,
      undefined,
      onTextureError
    );
  }

  if (sunHaloColorTexture === undefined) {
    sunHaloColorTexture = textureLoader.load(
      "src/assets/textures/halo_colorshift.png",
      undefined,
      undefined,
      onTextureError
    );
  }

  if (sunCoronaTexture === undefined) {
    setLoadMessage("Projecting coronal ejecta");
    sunCoronaTexture = textureLoader.load(
      "src/assets/textures/corona.png",
      undefined,
      undefined,
      onTextureError
    );
  }
}

var surfaceGeo = new THREE.SphereGeometry(7.35144e-8, 60, 30);
function makeStarSurface(radius, uniforms) {
  var shaderList = window.shaderList;
  var sunShaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: shaderList.starsurface.vertex,
    fragmentShader: shaderList.starsurface.fragment,
  });

  var sunSphere = new THREE.Mesh(surfaceGeo, sunShaderMaterial);
  return sunSphere;
}

var haloGeo = new THREE.PlaneGeometry(0.00000022, 0.00000022);
function makeStarHalo(uniforms) {
  var shaderList = window.shaderList;
  var sunHaloMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: shaderList.starhalo.vertex,
    fragmentShader: shaderList.starhalo.fragment,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 100,
  });

  var sunHalo = new THREE.Mesh(haloGeo, sunHaloMaterial);
  sunHalo.position.set(0, 0, 0);
  return sunHalo;
}

var glowGeo = new THREE.PlaneGeometry(0.0000012, 0.0000012);
function makeStarGlow(uniforms) {
  var shaderList = window.shaderList;
  var sunGlowMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    blending: THREE.AdditiveBlending,
    fragmentShader: shaderList.corona.fragment,
    vertexShader: shaderList.corona.vertex,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: 100,
    depthTest: true,
    depthWrite: true,
  });

  var sunGlow = new THREE.Mesh(glowGeo, sunGlowMaterial);
  sunGlow.position.set(0, 0, 0);
  return sunGlow;
}

function makeStarLensflare(size, zextra, hueShift) {
  var addStarLensFlare = window.addStarLensFlare;
  var constrain = window.constrain;

  var sunLensFlare = addStarLensFlare(0, 0, zextra, size, undefined, hueShift);
  sunLensFlare.customUpdateCallback = function (object) {
    var camera = window.camera;
    if (object.visible == false) return;
    var f,
      fl = this.lensFlares.length;
    var flare;
    var vecX = -this.positionScreen.x * 2;
    var vecY = -this.positionScreen.y * 2;
    var size = object.size ? object.size : 16000;

    var camDistance = camera.position.length();

    for (f = 0; f < fl; f++) {
      flare = this.lensFlares[f];

      flare.x = this.positionScreen.x + vecX * flare.distance;
      flare.y = this.positionScreen.y + vecY * flare.distance;

      flare.scale = (size / Math.pow(camDistance, 2.0)) * 2.0;

      if (camDistance < 10.0) {
        flare.opacity = Math.pow(camDistance * 2.0, 2.0);
      } else {
        flare.opacity = 1.0;
      }

      flare.rotation = 0;
    }

    for (f = 2; f < fl; f++) {
      flare = this.lensFlares[f];
      var dist = Math.sqrt(Math.pow(flare.x, 2) + Math.pow(flare.y, 2));
      flare.opacity = constrain(dist, 0.0, 1.0);
      flare.wantedRotation = flare.x * Math.PI * 0.25;
      flare.rotation += (flare.wantedRotation - flare.rotation) * 0.25;
    }
  };
  return sunLensFlare;
}

var solarflareGeometry = new THREE.TorusGeometry(
  0.00000003,
  0.000000001 + 0.000000002,
  60,
  90,
  0.15 + Math.PI,
);
function makeSolarflare(uniforms) {
  var shaderList = window.shaderList;
  var solarflareMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: shaderList.starflare.vertex,
    fragmentShader: shaderList.starflare.fragment,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -100,
    polygonOffsetUnits: 1000,
  });

  var solarflareMesh = new THREE.Object3D();

  for (var i = 0; i < 6; i++) {
    var solarflare = new THREE.Mesh(solarflareGeometry, solarflareMaterial);
    solarflare.rotation.y = Math.PI / 2;
    solarflare.speed = Math.random() * 0.01 + 0.005;
    solarflare.rotation.z = Math.PI * Math.random() * 2;
    solarflare.rotation.x = -Math.PI + Math.PI * 2;
    solarflare.update = function () {
      this.rotation.z += this.speed;
    };
    var solarflareContainer = new THREE.Object3D();
    solarflareContainer.position.x = -1 + Math.random() * 2;
    solarflareContainer.position.y = -1 + Math.random() * 2;
    solarflareContainer.position.z = -1 + Math.random() * 2;
    solarflareContainer.position.multiplyScalar(7.35144e-8 * 0.8);
    solarflareContainer.lookAt(new THREE.Vector3(0, 0, 0));
    solarflareContainer.add(solarflare);

    solarflareMesh.add(solarflareContainer);
  }

  return solarflareMesh;
}

export function makeSun(options) {
  var shaderList = window.shaderList;
  var starColorGraph = window.starColorGraph || window.fediverseColorGraph;
  var glowSpanTexture = window.glowSpanTexture;
  var camera = window.camera;
  var gui = window.gui;

  var radius = options.radius;
  var spectral = options.spectral;

  loadStarSurfaceTextures();

  var sunUniforms = {
    texturePrimary: { value: sunTexture },
    textureColor: { value: sunColorLookupTexture },
    textureSpectral: { value: starColorGraph },
    time: { value: 0 },
    spectralLookup: { value: 0 },
  };

  var solarflareUniforms = {
    texturePrimary: { value: solarflareTexture },
    time: { value: 0 },
    textureSpectral: { value: starColorGraph },
    spectralLookup: { value: 0 },
  };

  var haloUniforms = {
    texturePrimary: { value: sunHaloTexture },
    textureColor: { value: sunHaloColorTexture },
    time: { value: 0 },
    textureSpectral: { value: starColorGraph },
    spectralLookup: { value: 0 },
  };

  var coronaUniforms = {
    texturePrimary: { value: sunCoronaTexture },
    textureSpectral: { value: starColorGraph },
    spectralLookup: { value: 0 },
  };

  var sun = new THREE.Object3D();

  var starSurface = makeStarSurface(radius, sunUniforms);
  sun.add(starSurface);

  var solarflare = makeSolarflare(solarflareUniforms);
  sun.solarflare = solarflare;
  sun.add(solarflare);

  var gyro = new Gyroscope();
  sun.add(gyro);
  sun.gyro = gyro;

  var starLensflare = makeStarLensflare(1.5, 0.0001, spectral);
  sun.lensflare = starLensflare;
  sun.lensflare.name == "lensflare";
  gyro.add(starLensflare);

  var starHalo = makeStarHalo(haloUniforms);
  gyro.add(starHalo);

  var starGlow = makeStarGlow(coronaUniforms);
  gyro.add(starGlow);

  var latticeMaterial = new THREE.MeshBasicMaterial({
    map: glowSpanTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    wireframe: true,
    opacity: 0.8,
  });

  var lattice = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius * 1.25, 2),
    latticeMaterial,
  );
  lattice.update = function () {
    this.rotation.y += 0.001;
    this.rotation.z -= 0.0009;
    this.rotation.x -= 0.0004;
  };
  lattice.material.map.wrapS = THREE.RepeatWrapping;
  lattice.material.map.wrapT = THREE.RepeatWrapping;
  lattice.material.map.needsUpdate = true;
  lattice.material.map.onUpdate = function () {
    this.offset.y -= 0.01;
    this.needsUpdate = true;
  };

  sun.add(lattice);

  sun.sunUniforms = sunUniforms;
  sun.solarflareUniforms = solarflareUniforms;
  sun.haloUniforms = haloUniforms;
  sun.coronaUniforms = coronaUniforms;

  sun.setSpectralIndex = function (index) {
    var starColor = map(index, -0.3, 1.52, 0, 1);
    starColor = constrain(starColor, 0.0, 1.0);
    this.starColor = starColor;

    this.sunUniforms.spectralLookup.value = starColor;
    this.solarflareUniforms.spectralLookup.value = starColor;
    this.haloUniforms.spectralLookup.value = starColor;
    this.coronaUniforms.spectralLookup.value = starColor;
  };

  sun.setScale = function (index) {
    // 修复：直接设置缩放值，而不是设置向量长度
    this.scale.set(index, index, index);

    // 同时缩放gyro内的光晕元素，使其与星球大小成比例
    this.gyro.scale.set(index, index, index);

    this.gyro.remove(this.lensflare);

    // lensflare大小应该随着星球缩放成比例增长
    var lensflareSize = 2.0 + index * 1.0 + 0.2 * Math.pow(index, 2);
    if (lensflareSize < 1.5) lensflareSize = 1.5;
    this.lensflare = makeStarLensflare(
      lensflareSize,
      0.0002 * index,
      this.starColor,
    );
    this.lensflare.name = "lensflare";
    this.gyro.add(this.lensflare);
  };

  sun.randomizeSolarFlare = function () {
    this.solarflare.rotation.x = Math.random() * Math.PI * 2;
    this.solarflare.rotation.y = Math.random() * Math.PI * 2;
  };

  sun.setSpectralIndex(spectral);

  sun.update = function () {
    var shaderTiming = window.shaderTiming;
    var rotateYAccumulate = window.rotateYAccumulate;

    this.sunUniforms.time.value = shaderTiming;
    this.haloUniforms.time.value = shaderTiming + rotateYAccumulate;
    this.solarflareUniforms.time.value = shaderTiming;

    if (camera.position.z > 400) {
      var lensflareChild = this.gyro.getObjectByName("lensflare");
      if (lensflareChild !== undefined) this.gyro.remove(lensflareChild);
    } else {
      if (this.gyro.getObjectByName("lensflare") === undefined) {
        this.gyro.add(this.lensflare);
      }
    }
  };

  if (gui) {
    var c = gui.add(sunUniforms.spectralLookup, "value", -0.25, 1.5);
    c.onChange(function (v) {
      sun.setSpectralIndex(v);
    });
  }

  return sun;
}

window.makeSun = makeSun;
