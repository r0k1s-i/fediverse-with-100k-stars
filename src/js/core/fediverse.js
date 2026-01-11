
import { constrain } from '../utils/math.js';
import { addClass, removeClass, fadeIn, fadeOut } from '../utils/dom.js';

var textureLoader = new THREE.TextureLoader();

var fediverseTexture0 = textureLoader.load("src/assets/textures/p_0.png");
var fediverseTexture1 = textureLoader.load("src/assets/textures/p_2.png");
var fediverseHeatVisionTexture = textureLoader.load(
  "src/assets/textures/sharppoint.png",
);
var instancePreviewTexture = textureLoader.load(
  "src/assets/textures/star_preview.png",
  undefined,
  setLoadMessage("Focusing optics"),
);
var fediverseColorGraph = textureLoader.load(
  "src/assets/textures/star_color_modified.png",
);

var instanceSunHaloTexture = textureLoader.load(
  "src/assets/textures/sun_halo.png",
);
var instanceCoronaTexture = textureLoader.load(
  "src/assets/textures/corona.png",
);

var MAJOR_INSTANCE_COLORS = {
  "mastodon.social": 0xffffff,
  "misskey.io": 0xffffff,
  "pixelfed.social": 0xffffff,
};

function isMajorInstance(domain) {
  return MAJOR_INSTANCE_COLORS.hasOwnProperty(domain);
}

function getMajorInstanceColor(domain) {
  return MAJOR_INSTANCE_COLORS[domain];
}

function createMajorInstancePreview(color) {
  var camera = window.camera;
  var container = new THREE.Object3D();

  var haloMaterial = new THREE.MeshBasicMaterial({
    map: instanceSunHaloTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    color: color || 0xffffff,
  });
  var haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), haloMaterial);
  container.add(haloMesh);

  var coronaMaterial = new THREE.MeshBasicMaterial({
    map: instanceCoronaTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    color: color || 0xffffff,
  });
  var coronaMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    coronaMaterial,
  );
  container.add(coronaMesh);

  container.update = function () {
    var zoomFactor = camera.position.z;
    var opacity = constrain(Math.pow(zoomFactor * 0.002, 2), 0, 1);
    if (opacity < 0.1) opacity = 0.0;

    haloMaterial.opacity = opacity;
    coronaMaterial.opacity = opacity * 0.6;

    if (opacity <= 0.0) {
      this.visible = false;
    } else {
      this.visible = true;
    }

    var scale = constrain(Math.pow(zoomFactor * 0.001, 2), 0.1, 1.5);
    this.scale.setLength(scale);
  };

  return container;
}

var fediverseUniforms = {
  color: { value: new THREE.Color(0xffffff) },
  texture0: { value: fediverseTexture0 },
  texture1: { value: fediverseTexture1 },
  heatVisionTexture: { value: fediverseHeatVisionTexture },
  spectralLookup: { value: fediverseColorGraph },
  idealDepth: { value: 1.0 },
  blurPower: { value: 1.0 },
  blurDivisor: { value: 2.0 },
  sceneSize: { value: 120.0 },
  cameraDistance: { value: 800.0 },
  zoomSize: { value: 1.0 },
  scale: { value: 1.0 },
  brightnessScale: { value: 1.0 },
  heatVision: { value: 0.0 },
};

var fediverseInstances = [];
var fediverseMeshes = [];

function generateVirtualParticles(targetCount) {
  var virtualParticles = [];
  var realCount = fediverseInstances.length;
  var virtualCount = Math.max(0, targetCount - realCount);

  if (realCount === 0 || virtualCount === 0) {
    return virtualParticles;
  }

  var totalWeight = 0;
  var weights = [];
  for (var i = 0; i < realCount; i++) {
    var userCount = fediverseInstances[i].stats
      ? fediverseInstances[i].stats.user_count
      : 1;
    var weight = Math.log(userCount + 1) + 1;
    weights.push(weight);
    totalWeight += weight;
  }

  for (var i = 0; i < virtualCount; i++) {
    var r = Math.random() * totalWeight;
    var cumulative = 0;
    var parentIdx = 0;
    for (var j = 0; j < realCount; j++) {
      cumulative += weights[j];
      if (r <= cumulative) {
        parentIdx = j;
        break;
      }
    }

    var parent = fediverseInstances[parentIdx];
    var parentPos = parent.position;
    var parentUserCount = parent.stats ? parent.stats.user_count : 1;

    var spread = 50 + Math.log(parentUserCount + 1) * 30;

    var offsetX = (Math.random() - 0.5) * spread * 2;
    var offsetY = (Math.random() - 0.5) * spread * 2;
    var offsetZ = (Math.random() - 0.5) * spread * 0.5;

    var domainHash = 0;
    for (var k = 0; k < parent.domain.length; k++) {
      domainHash = (domainHash * 31 + parent.domain.charCodeAt(k)) % 1000;
    }
    var baseSpectral = 0.2 + (domainHash / 1000) * 0.6;
    var spectralVariation = (Math.random() - 0.5) * 0.15;

    virtualParticles.push({
      position: {
        x: parentPos.x + offsetX,
        y: parentPos.y + offsetY,
        z: parentPos.z + offsetZ,
      },
      size: 8 + Math.random() * 10,
      spectralLookup: Math.max(0.1, Math.min(0.9, baseSpectral + spectralVariation)),
      brightness: 0.5 + Math.random() * 0.4,
      isVirtual: true,
    });
  }

  return virtualParticles;
}

export function loadFediverseData(dataFile, callback) {
  var xhr = new XMLHttpRequest();
  setLoadMessage("Fetching Fediverse data");
  xhr.addEventListener(
    "load",
    function (event) {
      var parsed = JSON.parse(xhr.responseText);
      var SCALE_FACTOR = 5;
      for (var i = 0; i < parsed.length; i++) {
        if (parsed[i].position) {
          parsed[i].position.x /= SCALE_FACTOR;
          parsed[i].position.y /= SCALE_FACTOR;
          parsed[i].position.z /= SCALE_FACTOR;
        }
      }
      if (callback) {
        setLoadMessage("Parsing instance data");
        fediverseInstances = parsed;
        callback(parsed);
      }
    },
    false,
  );
  xhr.open("GET", dataFile, true);
  xhr.send(null);
}

export function generateFediverseInstances() {
  var shaderList = window.shaderList;
  var camera = window.camera;
  var attachLegacyMarker = window.attachLegacyMarker;
  var spectralGraphEl = window.spectralGraphEl;
  var iconNavEl = window.iconNavEl;

  var container = new THREE.Object3D();
  var count = fediverseInstances.length;

  var TARGET_PARTICLE_COUNT = 100000;
  var virtualParticles = generateVirtualParticles(TARGET_PARTICLE_COUNT);
  
  var totalPoints = count + virtualParticles.length;
  var geometry = new THREE.BufferGeometry();
  
  var positions = new Float32Array(totalPoints * 3);
  var colors = new Float32Array(totalPoints * 3);
  var sizes = new Float32Array(totalPoints);
  var colorIndexes = new Float32Array(totalPoints);
  var isVirtuals = new Float32Array(totalPoints);

  var instancePreviews = new THREE.Object3D();
  container.add(instancePreviews);

  var instancePreviewMaterial = new THREE.MeshBasicMaterial({
    map: instancePreviewTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  var instancePreview = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    instancePreviewMaterial,
  );
  
  var linePositions = [];
  var MIN_USERS_FOR_LINE = 50000;

  for (var i = 0; i < count; i++) {
    var instance = fediverseInstances[i];

    var x = instance.position.x;
    var y = instance.position.y;
    var z = instance.position.z;

    var userCount = instance.stats ? instance.stats.user_count : 1;
    var size = Math.max(15.0, Math.log(userCount + 1) * 8);
    
    var domainHash = 0;
    for (var j = 0; j < instance.domain.length; j++) {
      domainHash = (domainHash * 31 + instance.domain.charCodeAt(j)) % 1000;
    }

    var spectralLookup = 0.2 + (domainHash / 1000) * 0.6;
    var brightness = 1.0;
    var isVirtual = 0.0;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    
    colors[i * 3] = 1.0;
    colors[i * 3 + 1] = 1.0;
    colors[i * 3 + 2] = 1.0;
    
    sizes[i] = size;
    colorIndexes[i] = spectralLookup;
    isVirtuals[i] = isVirtual;

    if (userCount >= MIN_USERS_FOR_LINE) {
        linePositions.push(x, y, z);
        linePositions.push(x, y, 0);
    }

    var MIN_USERS_FOR_HTML_LABEL = 999999999;
    var showHTMLLabel = userCount >= MIN_USERS_FOR_HTML_LABEL;

    if (
      instance.positionType === "three_star_center" ||
      instance.positionType === "galaxy_center" ||
      userCount > 1000
    ) {

      var gyroInstance = new THREE.Gyroscope();
      gyroInstance.position.set(x, y, z);

      if (isMajorInstance(instance.domain)) {
        var majorColor = getMajorInstanceColor(instance.domain);
        var majorPreview = createMajorInstancePreview(majorColor);
        gyroInstance.add(majorPreview);
      } else {
        var preview = instancePreview.clone();
        gyroInstance.add(preview);

        preview.update = function () {
          this.material.opacity = constrain(
            Math.pow(camera.position.z * 0.002, 2),
            0,
            1,
          );
          if (this.material.opacity < 0.1) this.material.opacity = 0.0;
          if (this.material.opacity <= 0.0) this.visible = false;
          else this.visible = true;
          this.scale.setLength(
            constrain(Math.pow(camera.position.z * 0.001, 2), 0, 1),
          );
        };
      }

      var g = new THREE.Gyroscope();
      container.add(g);
      g.name = instance.name || instance.domain;
      g.instanceData = instance;
      g.position.set(x, y, z);
      g.scale.setLength(1.0);
      g.visible = true;

      if (showHTMLLabel) {
        attachLegacyMarker(instance.domain, g, 1.0, { min: 0, max: 50000 });
      }

      instancePreviews.add(gyroInstance);
      fediverseMeshes.push(g);
    }
  }

  var offset = count;
  for (var i = 0; i < virtualParticles.length; i++) {
    var vp = virtualParticles[i];
    var idx = offset + i;

    positions[idx * 3] = vp.position.x;
    positions[idx * 3 + 1] = vp.position.y;
    positions[idx * 3 + 2] = vp.position.z;
    
    colors[idx * 3] = 1.0;
    colors[idx * 3 + 1] = 1.0;
    colors[idx * 3 + 2] = 1.0;
    
    sizes[idx] = vp.size;
    colorIndexes[idx] = vp.spectralLookup;
    isVirtuals[idx] = 1.0;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('colorIndex', new THREE.BufferAttribute(colorIndexes, 1));
  geometry.setAttribute('isVirtual', new THREE.BufferAttribute(isVirtuals, 1));

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: fediverseUniforms,
    vertexShader: shaderList.datastars.vertex,
    fragmentShader: shaderList.datastars.fragment,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });

  container.heatVision = false;
  container.shaderMaterial = shaderMaterial;

  container.toggleHeatVision = function (desired) {
    if (desired !== undefined) container.heatVision = !desired;

    if (container.heatVision == false) {
      container.shaderMaterial.blending = THREE.NormalBlending;
      container.shaderMaterial.depthTest = true;
      container.shaderMaterial.depthWrite = true;
      container.shaderMaterial.transparent = false;
    } else {
      container.shaderMaterial.blending = THREE.AdditiveBlending;
      container.shaderMaterial.depthTest = false;
      container.shaderMaterial.depthWrite = false;
      container.shaderMaterial.transparent = true;
    }

    container.heatVision = !container.heatVision;

    if (container.heatVision) {
      addClass(spectralGraphEl, "heatvision");
      fadeIn(spectralGraphEl);
      addClass(iconNavEl, "heatvision");
    } else {
      removeClass(spectralGraphEl, "heatvision");
      fadeOut(spectralGraphEl);
      removeClass(iconNavEl, "heatvision");
    }
  };

  window.toggleHeatVision = container.toggleHeatVision;

  var pSystem = new THREE.Points(geometry, shaderMaterial);

  var lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  
  var lineMesh = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: 0x333333,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    })
  );
  pSystem.add(lineMesh);

  var glowSpanTexture = window.glowSpanTexture;
  var gridMaterial = new THREE.MeshBasicMaterial({
    map: glowSpanTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    wireframe: true,
    opacity: 0.6,
  });
  var gridPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000, 60, 60),
    gridMaterial,
  );
  gridPlane.material.map.wrapS = THREE.RepeatWrapping;
  gridPlane.material.map.wrapT = THREE.RepeatWrapping;
  gridPlane.material.map.repeat.set(8, 8);
  gridPlane.material.map.needsUpdate = true;
  gridPlane.material.map.onUpdate = function () {
    this.offset.y -= 0.0002;
    this.needsUpdate = true;
  };
  gridPlane.update = function () {
    if (camera.position.z < 1500) {
      this.material.opacity = constrain(
        (camera.position.z - 300.0) * 0.001,
        0,
        0.6,
      );
    } else {
      this.material.opacity += (0.0 - this.material.opacity) * 0.05;
    }
    if (this.material.opacity <= 0) this.visible = false;
    else this.visible = true;
  };
  pSystem.add(gridPlane);

  container.add(pSystem);

  container.update = function () {
    camera = window.camera; 
    
    var blueshift = (camera.position.z + 5000.0) / 60000.0;
    blueshift = constrain(blueshift, 0.0, 0.2);

    var brightnessScale = constrain(10 / Math.sqrt(camera.position.z), 0, 1);

    if (container.heatVision) {
      fediverseUniforms.cameraDistance.value = 0.0;
      fediverseUniforms.brightnessScale.value = 1.0;
      fediverseUniforms.heatVision.value +=
        (1.0 - fediverseUniforms.heatVision.value) * 0.2;
    } else {
      fediverseUniforms.brightnessScale.value = brightnessScale;
      fediverseUniforms.heatVision.value +=
        (0.0 - fediverseUniforms.heatVision.value) * 0.2;
    }

    if (fediverseUniforms.heatVision.value < 0.01)
      fediverseUniforms.heatVision.value = 0.0;

    fediverseUniforms.cameraDistance.value = blueshift;
    fediverseUniforms.zoomSize.value = constrain(
      camera.position.z / 4000,
      0,
      1,
    );

    var areaOfWindow = window.innerWidth * window.innerHeight;
    fediverseUniforms.scale.value = Math.sqrt(areaOfWindow) * 1.5;

    fediverseUniforms.sceneSize.value = 10000;
  };

  lineMesh.update = function () {
    if (camera.position.z < 1500) {
      this.material.opacity = constrain(
        (camera.position.z - 400.0) * 0.002,
        0,
        1,
      );
    } else {
      this.material.opacity += (0.0 - this.material.opacity) * 0.1;
    }

    if (camera.position.z < 250) this.visible = false;
    else this.visible = true;
  };

  window.fediverseMeshes = fediverseMeshes;
  
  return container;
}

export function getInstanceByDomain(domain) {
  for (var i = 0; i < fediverseInstances.length; i++) {
    if (fediverseInstances[i].domain === domain) {
      return fediverseInstances[i];
    }
  }
  return null;
}

export function getSoftwareColor(softwareName) {
  var colors = {
    Mastodon: "#6364FF",
    Misskey: "#86b300",
    Pixelfed: "#E15C81",
    Lemmy: "#00BC8C",
    PeerTube: "#F1680D",
    Pleroma: "#FBA457",
    Akkoma: "#9B59B6",
    Friendica: "#FFA500",
    Diaspora: "#2E3436",
    WriteFreely: "#00A86B",
  };
  return colors[softwareName] || "#888888";
}

window.loadFediverseData = loadFediverseData;
window.generateFediverseInstances = generateFediverseInstances;
window.getInstanceByDomain = getInstanceByDomain;
window.getSoftwareColor = getSoftwareColor;
window.fediverseInstances = fediverseInstances;
window.fediverseColorGraph = fediverseColorGraph;
