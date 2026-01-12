import * as THREE from 'three';
import { constrain, pickRandomIndices } from '../utils/math.js';
import { addClass, removeClass, fadeIn, fadeOut } from '../utils/dom.js';
import { Gyroscope } from './Gyroscope.js';

var textureLoader = new THREE.TextureLoader();

function onTextureError(err) {
  console.error("Error loading texture:", err);
}

var fediverseTexture0 = textureLoader.load(
  "src/assets/textures/p_0.png",
  undefined,
  undefined,
  onTextureError
);
var fediverseTexture1 = textureLoader.load(
  "src/assets/textures/p_2.png",
  undefined,
  undefined,
  onTextureError
);
var fediverseHeatVisionTexture = textureLoader.load(
  "src/assets/textures/sharppoint.png",
  undefined,
  undefined,
  onTextureError
);

setLoadMessage("Focusing optics");
var instancePreviewTexture = textureLoader.load(
  "src/assets/textures/star_preview.png",
  undefined,
  undefined,
  onTextureError
);
var fediverseColorGraph = textureLoader.load(
  "src/assets/textures/star_color_modified.png",
  undefined,
  undefined,
  onTextureError
);

var instanceSunHaloTexture = textureLoader.load(
  "src/assets/textures/sun_halo.png",
  undefined,
  undefined,
  onTextureError
);
var instanceCoronaTexture = textureLoader.load(
  "src/assets/textures/corona.png",
  undefined,
  undefined,
  onTextureError
);
var fediverseTexture1 = textureLoader.load(
  "src/assets/textures/p_2.png",
  undefined,
  undefined,
  onTextureError
);
var fediverseHeatVisionTexture = textureLoader.load(
  "src/assets/textures/sharppoint.png",
  undefined,
  undefined,
  onTextureError
);

setLoadMessage("Focusing optics");
var instancePreviewTexture = textureLoader.load(
  "src/assets/textures/star_preview.png",
  undefined,
  undefined,
  onTextureError
);
var fediverseColorGraph = textureLoader.load(
  "src/assets/textures/star_color_modified.png",
  undefined,
  undefined,
  onTextureError
);

var instanceSunHaloTexture = textureLoader.load(
  "src/assets/textures/sun_halo.png",
  undefined,
  undefined,
  onTextureError
);
var instanceCoronaTexture = textureLoader.load(
  "src/assets/textures/corona.png",
  undefined,
  undefined,
  onTextureError
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

var iconUniforms = {
  color: { value: new THREE.Color(0xffffff) },
  map: { value: instancePreviewTexture },
  scale: { value: 1.0 },
  zoomSize: { value: 1.0 },
  cameraZ: { value: 1000.0 },
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

  var iconPositions = [];
  var iconColors = [];
  var iconSizes = [];
  
  var linePositions = [];
  var TARGET_LINE_COUNT = 50;
  var lineIndices = new Set(pickRandomIndices(count, TARGET_LINE_COUNT));

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

    if (lineIndices.has(i)) {
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

      if (isMajorInstance(instance.domain)) {
        var gyroInstance = new Gyroscope();
        gyroInstance.position.set(x, y, z);
        var majorColor = getMajorInstanceColor(instance.domain);
        var majorPreview = createMajorInstancePreview(majorColor);
        gyroInstance.add(majorPreview);
        instancePreviews.add(gyroInstance);
        
        var g = new Gyroscope();
        container.add(g);
        g.name = instance.name || instance.domain;
        g.instanceData = instance;
        g.position.set(x, y, z);
        g.scale.setLength(1.0);
        g.visible = true;
        fediverseMeshes.push(g);

        if (showHTMLLabel) {
            attachLegacyMarker(instance.domain, g, 1.0, { min: 0, max: 50000 });
        }

      } else {
        iconPositions.push(x, y, z);
        iconColors.push(1.0, 1.0, 1.0); 
        iconSizes.push(40.0);
      }
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

  if (iconPositions.length > 0) {
      var iconGeometry = new THREE.BufferGeometry();
      iconGeometry.setAttribute('position', new THREE.Float32BufferAttribute(iconPositions, 3));
      iconGeometry.setAttribute('customColor', new THREE.Float32BufferAttribute(iconColors, 3));
      iconGeometry.setAttribute('size', new THREE.Float32BufferAttribute(iconSizes, 1));
      
      var iconMaterial = new THREE.ShaderMaterial({
          uniforms: iconUniforms,
          vertexShader: shaderList.icon.vertex,
          fragmentShader: shaderList.icon.fragment,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
          transparent: true,
      });
      
      var iconSystem = new THREE.Points(iconGeometry, iconMaterial);
      container.add(iconSystem);
  }

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

  var rippleVertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  var rippleFragmentShader = `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;

    void main() {
      vec2 centeredUv = vUv - 0.5;
      float dist = length(centeredUv);
      float angle = atan(centeredUv.y, centeredUv.x);
      
      // --- 1. 同心圆 (Rings) ---
      // 使用标准导数实现屏幕空间固定线宽 (类似 wireframe)
      float density = 200.0;
      float gridR = dist * density - time * 0.2;
      
      float fR = abs(fract(gridR + 0.5) - 0.5);
      float dfR = fwidth(gridR);
      float rings = 1.0 - smoothstep(0.0, dfR * 2.0, fR);
      
      // --- 2. 放射线 (Spokes) ---
      float spokeCount = 24.0; // 放射线数量
      float gridA = angle / 6.2831853 * spokeCount;
      float fA = abs(fract(gridA + 0.5) - 0.5);
      float dfA = fwidth(gridA);
      float spokes = 1.0 - smoothstep(0.0, dfA * 2.0, fA);
      
      // 组合图案
      float pattern = max(rings, spokes);
      
      // --- 3. 水波律动 (Flow) ---
      // 创建向外扩散的正弦波光环
      // dist * 10.0 控制波的密度（波长），time * 1.5 控制扩散速度
      float flow = sin(dist * 10.0 - time * 2.0);
      
      // 将正弦波映射到 [0.2, 1.0] 区间：
      // 0.2 是基础亮度（暗处不完全消失），1.0 是波峰亮度
      float pulse = smoothstep(-1.0, 1.0, flow) * 0.8 + 0.2;
      
      // 让波峰更锐利一点，更有"光波"的感觉
      pulse = pow(pulse, 2.0);

      // Circular mask fade out
      float edgeFade = 1.0 - smoothstep(0.4, 0.5, dist);
      
      // Inner fade
      float centerFade = smoothstep(0.0, 0.05, dist);

      // 组合：图案 * 律动光波 * 基础透明度 * 边缘遮罩
      float finalAlpha = pattern * pulse * opacity * edgeFade * centerFade;
      
      if (finalAlpha < 0.01) discard;
      
      gl_FragColor = vec4(color, finalAlpha);
    }
  `;

  var rippleUniforms = {
    time: { value: 0 },
    color: { value: new THREE.Color(0x336699) }, // 提亮颜色，保持冷色调
    opacity: { value: 0 }
  };

  var gridMaterial = new THREE.ShaderMaterial({
    uniforms: rippleUniforms,
    vertexShader: rippleVertexShader,
    fragmentShader: rippleFragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  var gridPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    gridMaterial,
  );
  gridPlane.visible = false;

  gridPlane.update = function () {
    rippleUniforms.time.value += 0.01;

    // 可见上限调整为 1900:
    // - Grid View (1800) 下可见
    // - 初始视距 (2000) 下不可见
    if (camera.position.z < 1900) {
      var targetOpacity = constrain(
        (camera.position.z - 300.0) * 0.001,
        0,
        0.8,
      );
      rippleUniforms.opacity.value = targetOpacity;
    } else {
      rippleUniforms.opacity.value += (0.0 - rippleUniforms.opacity.value) * 0.05;
    }
    
    if (rippleUniforms.opacity.value <= 0.01) this.visible = false;
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
    
    iconUniforms.cameraZ.value = camera.position.z;
    iconUniforms.zoomSize.value = fediverseUniforms.zoomSize.value;
    iconUniforms.scale.value = fediverseUniforms.scale.value;
  };

  lineMesh.update = function () {
    if (camera.position.z < 1900) {
      this.material.opacity = constrain(
        (camera.position.z - 300.0) * 0.002,
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
