import { $, css, fadeIn, fadeOut, trigger, find } from "../utils/dom.js";
import { constrain } from "../utils/math.js";
import * as THREE from "three";
import { TWEEN } from "../lib/tween.js";

window.THREE = THREE;
window.TWEEN = TWEEN;

import "./globals.js";

import "./config.js";
import "../utils/misc.js";
import "../utils/three-helpers.js";
import "../utils/app.js";

import { shaderList, loadShaders } from "./shaders.js";

import "./skybox.js";
import "./plane.js";
import "./guides.js";
import { generateDust } from "./dust.js";
import { addLensFlare } from "./lensflare.js";
import { attachLegacyMarker } from "./legacymarkers.js";
import "./marker.js";
import "./mousekeyboard.js";
import "../core/urlArgs.js";

import "./infocallout.js";
import "./starsystems.js";
import { setStarModel } from "./starmodel.js"; // Import logic for positioning model
import { makeStarModels } from "./planet-model.js"; // Use GLB model instead of shader star
import { initCSS3D, setCSSWorld, setCSSCamera } from "./css3worldspace.js";
import "./helphud.js";
import "./spacehelpers.js";
import { loadFediverseData, generateFediverseInstances } from "./fediverse.js";
import "./interaction-math.js";
import {
  initFediverseInteraction,
  isAtFediverseCenter,
  shouldShowFediverseSystem,
  goToFediverseCenter,
} from "./fediverse-interaction.js";
import "./label-layout.js";
import {
  initFediverseLabels,
  updateFediverseLabels,
} from "./fediverse-labels.js";
import { generateGalaxy } from "./galaxy.js";
import { createBlackhole } from "./blackhole.js";
import "./solarsystem.js";
import { makeFediverseSystem } from "./fediverse-solarsystem.js";
import "./sun.js";
import { preloadPlanetModel } from "./planet-model.js";
import {
  applyPlanetRenderConfig,
  createPlanetSpotlight,
  getPlanetRenderConfig,
  restorePlanetRenderConfig,
  shouldUsePlanetSpotlight,
  updatePlanetSpotlightTransform,
} from "../lib/planet-render-config.mjs";

import {
  updateMinimap,
  initializeMinimap,
  setMinimap,
  activateMinimap,
} from "./minimap.js";

var masterContainer = document.getElementById("visualization");

var maxAniso = 1;
var enableDataStar = true;
var enableSkybox = true;
var enableGalaxy = true;
var enableDust = false;
var enableSolarSystem = true;
var enableStarModel = true;
var enableDirector = true;

var firstTime = localStorage ? localStorage.getItem("first") == null : true;

window.initialAutoRotate = true;

var startTime = Date.now();
var clock = new THREE.Clock();
var shaderTiming = 0;

var starNameEl = $("#star-name");

var iconNavEl = $("#icon-nav");

var detailContainerEl = $("#detailContainer");
var cssContainerEl = $("#css-container");

var spectralGraphEl = $("#spectral-graph");

var rotating;
var translating;
var galacticCentering;
var camera;
var scene;
var renderer;

var lastRotateY = 0;
var rotateYAccumulate = 0;

var starData;
var pSystem;
var pGalacticSystem;
var pDustSystem;
var earth;
var starModel;

var screenWhalf, screenHhalf;
var divCSSWorld, divCSSCamera;
var fovValue;

var screenWidth;
var screenHeight;

var gradientImage;
var gradientCanvas;
var planetRenderConfig = getPlanetRenderConfig();

var rtparam = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBFormat,
  stencilBufer: false,
};
var rt;

var antialias = gup("antialias") == 1 ? true : false;

var markerThreshold = {
  min: 200,
  max: 45000,
};

function start(e) {
  if (!Detector.webgl) {
    if (Detector.Chrome) {
      Detector.addGetWebGLMessage(
        [
          'Your graphics card does not support WebGL. Please try again on a different Windows, Mac, or Linux computer using <a href="http://www.google.com/chrome/" style="color:#ffffff; text-decoration:underline; text-transform:capitalize">Google Chrome</a><br>',
          'or another <a href="http://www.khronos.org/webgl/wiki_1_15/index.php/Getting_a_WebGL_Implementation" style="color:#ffffff; text-decoration:underline; text-transform:none"> WebGL-Compatible browser</a>. You can watch a video preview of the experiment below:',
          '<p><iframe style="margin-top:4em;" id="trailer" width=800 height=600 src="http://www.youtube.com/embed/TU6RAjABX40" frameborder="0" allowfullscreen></iframe></p>',
        ].join("\n"),
      );
      return;
    }
    Detector.addGetWebGLMessage();
    return;
  }

  gradientImage = document.createElement("img");
  gradientImage.crossOrigin = "Anonymous";
  gradientImage.onload = postStarGradientLoaded;
  gradientImage.src = "src/assets/textures/star_color_modified.png";
}

var postStarGradientLoaded = function () {
  gradientCanvas = document.createElement("canvas");
  gradientCanvas.width = gradientImage.width;
  gradientCanvas.height = gradientImage.height;
  var gradientCtx = gradientCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  gradientCtx.drawImage(
    gradientImage,
    0,
    0,
    gradientImage.width,
    gradientImage.height,
  );
  gradientCanvas.getColor = function (percentage) {
    return gradientCtx.getImageData(0, percentage * gradientImage.height, 1, 1)
      .data;
  };

  window.gradientCanvas = gradientCanvas;

  loadShaders(shaderList, function (e) {
    window.shaderList = e;
    postShadersLoaded();
  });
};

var postShadersLoaded = function () {
  preloadPlanetModel();

  loadFediverseData(window.fediverseDataPath, function (loadedData) {
    window.fediverseInstances = loadedData;
    initScene();
    animate();
  });
};

var controllers = {
  viewSize: 0.6,
  datastarSize: 1.0,
  sceneSize: 1000.0,
  sol: function () {
    camera.position.z = 1.1;
  },
  solarsystem: function () {
    camera.position.z = 18;
  },
  fediverse: function () {
    camera.position.z = 1840;
  },
  milkyway: function () {
    camera.position.z = 40000;
  },
};

function buildGUI() {
  if (initializeMinimap) initializeMinimap();
}

function initScene() {
  scene = new THREE.Scene();

  scene.add(new THREE.AmbientLight(0x505050));

  rotating = new THREE.Object3D();

  galacticCentering = new THREE.Object3D();

  translating = new THREE.Object3D();

  galacticCentering.add(translating);
  rotating.add(galacticCentering);

  scene.add(rotating);

  translating.targetPosition = new THREE.Vector3();
  translating.update = function () {
    if (this.easePanning) return;

    this.position.lerp(this.targetPosition, 0.1);
    if (this.position.distanceTo(this.targetPosition) < 0.01)
      this.position.copy(this.targetPosition);
  };

  window.scene = scene;
  window.rotating = rotating;
  window.translating = translating;
  window.galacticCentering = galacticCentering;

  var planetScene = new THREE.Scene();
  var localRoot = new THREE.Object3D();
  localRoot.name = "localRoot";
  planetScene.add(localRoot);

  var aspect = screenWidth / screenHeight;
  if (isNaN(aspect) || !isFinite(aspect)) aspect = 1.0;

  var planetCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100.0);
  planetCamera.position.set(0, 0, 3);

  planetScene.add(planetCamera);

  const planetLight = new THREE.DirectionalLight(0xffffff, 2.0); // Standard intensity
  planetLight.position.set(3, 10, 5); // Typical 45-degree angle studio light
  planetLight.castShadow = true; // Enable shadows
  planetLight.shadow.mapSize.width = 1024;
  planetLight.shadow.mapSize.height = 1024;
  planetLight.shadow.camera.near = 0.1;
  planetLight.shadow.camera.far = 20;
  planetScene.add(planetLight);

  const planetAmbient = new THREE.AmbientLight(0xffffff, 0.2); // Soft ambient
  planetScene.add(planetAmbient);

  // Fill light
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-3, 0, 2);
  planetScene.add(fillLight);

  // Rim light
  const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
  rimLight.position.set(0, 5, -5);
  planetScene.add(rimLight);

  const planetSpotlight = createPlanetSpotlight(THREE, planetRenderConfig);
  if (planetSpotlight) {
    planetScene.add(planetSpotlight);
    planetScene.add(planetSpotlight.target);
    window.planetSpotlight = planetSpotlight;
  }

  window.planetScene = planetScene;
  window.localRoot = localRoot;
  window.planetCamera = planetCamera;

  screenWidth = window.innerWidth;
  screenHeight = window.innerHeight;
  screenWhalf = window.innerWidth / 2;
  screenHhalf = window.innerHeight / 2;

  window.screenWidth = screenWidth;
  window.screenHeight = screenHeight;

  renderer = new THREE.WebGLRenderer({
    antialias: antialias,
    logarithmicDepthBuffer: true,
  });
  // Enable modern color management and tone mapping
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; // Enable shadow maps
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

  window.renderer = renderer;
  console.log("[DEBUG] Renderer created:", {
    logarithmicDepthBuffer: renderer.capabilities.logarithmicDepthBuffer,
    maxPrecision: renderer.capabilities.precision,
    antialias: antialias,
  });

  var devicePixelRatio = window.devicePixelRatio || 1;

  renderer.setSize(
    screenWidth * devicePixelRatio,
    screenHeight * devicePixelRatio,
  );
  renderer.domElement.style.width = screenWidth + "px";
  renderer.domElement.style.height = screenHeight + "px";

  renderer.autoClear = false;
  renderer.sortObjects = false;

  maxAniso = renderer.capabilities.getMaxAnisotropy();
  window.maxAniso = maxAniso;

  document.getElementById("glContainer").appendChild(renderer.domElement);

  window.addEventListener("mousemove", onDocumentMouseMove, true);
  masterContainer.addEventListener("windowResize", onDocumentResize, true);
  masterContainer.addEventListener("mousedown", onDocumentMouseDown, true);
  window.addEventListener("mouseup", onDocumentMouseUp, false);
  masterContainer.addEventListener("click", onClick, true);
  masterContainer.addEventListener("mousewheel", onMouseWheel, {
    passive: false,
  });
  masterContainer.addEventListener("DOMMouseScroll", onMouseWheel, {
    passive: false,
  });
  masterContainer.addEventListener("wheel", onMouseWheel, {
    passive: false,
  });
  masterContainer.addEventListener("keydown", onKeyDown, false);

  masterContainer.addEventListener("touchstart", touchStart, {
    passive: false,
  });
  window.addEventListener("touchend", touchEnd, false);
  window.addEventListener("touchmove", touchMove, { passive: false });

  camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    0.5,
    10000000,
  );
  camera.position.z = 2500;
  camera.rotation.vx = 0;
  camera.rotation.vy = 0;
  camera.position.target = {
    x: 0,
    z: 2000,
    pz: 2000,
  };
  window.camera = camera;

  if (enableSkybox) {
    setupSkyboxScene();
    initSkybox(true);
    // Note: Environment map for PBR is now set asynchronously in skybox.js
    // via PMREMGenerator when the cubemap loads
  }

  camera.update = function () {
    if (!this.easeZooming) {
      camera.position.z +=
        (camera.position.target.z - camera.position.z) * 0.125;
    }

    // Dynamically adjust near/far planes based on zoom level to prevent z-fighting
    // Always update near/far, even during easeZooming
    // Use continuous scaling instead of discrete steps to avoid jumps
    var z = Math.abs(camera.position.z);
    var newNear, newFar;

    // Continuous near/far calculation based on camera distance
    // This avoids sudden jumps at threshold boundaries
    // Improved: Ensure near plane never gets too small to prevent z-fighting
    if (z < 1) {
      newNear = Math.max(0.0001, z * 0.001); // Increased from 0.000001 to 0.0001
      newFar = Math.max(1, z * 100); // Increased multiplier for better range
    } else if (z < 100) {
      newNear = Math.max(0.001, z * 0.01); // More conservative near plane
      newFar = z * 100; // Increased from 50 to 100
    } else {
      newNear = z * 0.001;
      newFar = Math.min(10000000, z * 1000);
    }

    // Only update if change is significant (>5%) to reduce projection matrix updates
    var nearDiff = Math.abs(camera.near - newNear) / camera.near;
    var farDiff = Math.abs(camera.far - newFar) / camera.far;
    if (nearDiff > 0.05 || farDiff > 0.05) {
      camera.near = newNear;
      camera.far = newFar;
      camera.updateProjectionMatrix();
    }
  };

  camera.position.y = 0;
  camera.scale.z = 0.83;

  scene.add(camera);

  var windowResize = THREEx.WindowResize(renderer, camera);
  if (enableSkybox)
    windowResize = THREEx.WindowResize(renderer, window.cameraCube);

  var rotateY = Math.PI / 2;
  var rotateX = Math.PI * 0.05;
  window.rotateY = rotateY;
  window.rotateX = rotateX;

  buildGUI();

  sceneSetup();

  initCSS3D();
  if (initFediverseLabels) initFediverseLabels();

  var exoutEl = $("#ex-out");
  exoutEl.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    fadeOut(detailContainerEl);

    var titleEl = find($("#detailTitle"), "span");
    if (titleEl && titleEl.textContent && starNameEl) {
      starNameEl.innerHTML = "<span>" + titleEl.textContent + "</span>";
      css(starNameEl, {
        position: "",
        left: "",
        top: "",
        bottom: "",
        margin: "",
      });
    }

    css(cssContainerEl, { display: "block" });
    if (detailContainerEl.classList.contains("about")) {
      detailContainerEl.classList.remove("about");
    }
  });

  var zoombackEl = $("#zoom-back");
  zoombackEl.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    exoutEl.click();

    if (
      typeof shouldShowFediverseSystem === "function" &&
      shouldShowFediverseSystem()
    ) {
      goToFediverseCenter();
      if (window.fediverseInteraction)
        fediverseInteraction.lastViewedInstance = null;
    } else {
      zoomOut(750);
    }
  });

  setTimeout(function () {
    var s = "scale(1.0)";
    var layoutEl = $("#layout");

    css(layoutEl, {
      webkitTransform: s,
      mozTransform: s,
      msTransform: s,
      oTransform: s,
      transform: s,
    });

    fadeOut($("#loader"), 250);

    fadeIn(iconNavEl);
    iconNavEl.isReady = true;

    if (firstTime) {
      if (localStorage) localStorage.setItem("first", 0);
    }
  }, 500);

  document.getElementById("bgmusicA").addEventListener(
    "ended",
    function () {
      this.currentTime = 0;
      this.pause();
      var playB = function () {
        document.getElementById("bgmusicB").play();
      };
      setTimeout(playB, 15000);
    },
    false,
  );

  document.getElementById("bgmusicB").addEventListener(
    "ended",
    function () {
      this.currentTime = 0;
      this.pause();
      var playA = function () {
        document.getElementById("bgmusicA").play();
      };
      setTimeout(playA, 15000);
    },
    false,
  );

  var playPromise = document.getElementById("bgmusicA").play();
  if (playPromise !== undefined) {
    playPromise
      .then(function () {
        if (activateMinimap) activateMinimap();
      })
      .catch(function (error) {
        var startAudioOnInteraction = function () {
          if (activateMinimap) activateMinimap();

          if (localStorage && localStorage.getItem("sound") == 0) {
            return;
          }

          document.getElementById("bgmusicA").play();
          document.removeEventListener("click", startAudioOnInteraction);
          document.removeEventListener("touchstart", startAudioOnInteraction);
          document.removeEventListener("keydown", startAudioOnInteraction);
        };

        document.addEventListener("click", startAudioOnInteraction, {
          once: true,
          capture: true,
        });
        document.addEventListener("touchstart", startAudioOnInteraction, {
          once: true,
          capture: true,
        });
        document.addEventListener("keydown", startAudioOnInteraction, {
          once: true,
          capture: true,
        });
      });
  }

  if (localStorage && localStorage.getItem("sound") == 0) {
    muteSound();
  }
}

function sceneSetup() {
  if (enableStarModel) {
    starModel = makeStarModels();
    starModel.setSpectralIndex(0.9);
    starModel.setScale(1.0);
    starModel.visible = false;
    window.starModel = starModel;
    window.enableStarModel = enableStarModel;
  }

  pSystem = generateFediverseInstances();
  translating.add(pSystem);
  window.pSystem = pSystem;

  if (enableGalaxy) {
    pGalacticSystem = generateGalaxy();
    translating.add(pGalacticSystem);

    var blackhole = createBlackhole();
    rotating.add(blackhole);

    if (enableDust) {
      pDustSystem = generateDust();
      pGalacticSystem.add(pDustSystem);
      window.pDustSystem = pDustSystem;
    }
  }

  if (enableSolarSystem) {
    var fediverseSystem = makeFediverseSystem();
    translating.add(fediverseSystem);
  }

  if (enableSkybox) {
  }
}

function animate() {
  document.body.scrollTop = document.body.scrollLeft = 0;

  camera.update();
  camera.markersVisible =
    camera.position.z < markerThreshold.max &&
    camera.position.z > markerThreshold.min;

  lastRotateY = window.rotateY;

  var rotateX = window.rotateX;
  var rotateY = window.rotateY;
  var rotateVX = window.rotateVX;
  var rotateVY = window.rotateVY;

  rotateX += rotateVX;
  rotateY += rotateVY;

  rotateVX *= 0.9;
  rotateVY *= 0.9;

  if (window.dragging) {
    rotateVX *= 0.6;
    rotateVY *= 0.6;
  }

  if (window.initialAutoRotate) rotateVY = 0.0003;

  var spinCutoff = 100;
  if (translating.position.length() < 0.0001) {
    spinCutoff = 2;
  }

  if (camera.position.z < spinCutoff) {
    if (starModel) {
      starModel.rotation.x = rotateX;
      starModel.rotation.y = rotateY;
    }
    rotating.rotation.x = 0;
    rotating.rotation.y = 0;
  } else {
    rotating.rotation.x = rotateX;
    rotating.rotation.y = rotateY;
    if (starModel) {
      starModel.rotation.x = rotateX;
      starModel.rotation.y = rotateY;
    }
  }

  var isZoomedIn = camera.position.target.z < markerThreshold.min;
  var isZoomedToSolarSystem = camera.position.target.z > markerThreshold.min;

  if (
    typeof window.updateFediverseInteraction === "function" &&
    typeof fediverseInteraction !== "undefined"
  ) {
    window.updateFediverseInteraction();
  }

  var isFediverseHover =
    typeof fediverseInteraction !== "undefined" &&
    fediverseInteraction.intersected;

  var atFediverseCenter =
    typeof isAtFediverseCenter === "function" && isAtFediverseCenter();

  var detailDisplay = detailContainerEl
    ? detailContainerEl.style.display
    : "none";
  var starNameDisplay = starNameEl ? starNameEl.style.display : "none";
  var starNameOpacity = starNameEl
    ? parseFloat(starNameEl.style.opacity || 0)
    : 0;
  var cssDisplay = cssContainerEl ? cssContainerEl.style.display : "block";

  if (
    isZoomedIn &&
    camera.position.z < markerThreshold.min &&
    detailDisplay === "none" &&
    starNameDisplay === "none" &&
    !atFediverseCenter
  ) {
    fadeIn(starNameEl);
  } else if (
    (detailDisplay !== "none" || !isFediverseHover) &&
    (isZoomedToSolarSystem || detailDisplay !== "none") &&
    (starNameOpacity === 1.0 || starNameOpacity === "")
  ) {
    fadeOut(starNameEl);
  }

  if (isZoomedIn && cssDisplay !== "none") {
    css(cssContainerEl, { display: "none" });
  } else if (!isZoomedIn && cssDisplay === "none") {
    css(cssContainerEl, { display: "block" });
  }

  if (
    isZoomedToSolarSystem &&
    detailDisplay !== "none" &&
    !detailContainerEl.classList.contains("about") &&
    (!window.fediverseInteraction ||
      !window.fediverseInteraction.lastViewedInstance)
  ) {
    fadeOut(detailContainerEl);
  }

  if (detailDisplay === "none") {
    camera.position.x *= 0.95;
  } else {
    camera.position.x += (camera.position.target.x - camera.position.x) * 0.95;
  }

  var targetFov = constrain(
    Math.pow(camera.position.z, 2) / 100000,
    0.000001,
    40,
  );
  camera.fov = targetFov;
  fovValue = (0.5 / Math.tan((camera.fov * Math.PI) / 360)) * screenHeight;
  window.fovValue = fovValue;
  camera.updateProjectionMatrix();

  shaderTiming = (Date.now() - startTime) / 1000;
  window.shaderTiming = shaderTiming;

  rotateYAccumulate += Math.abs(rotateY - lastRotateY) * 5;
  window.rotateYAccumulate = rotateYAccumulate;

  rotating.traverse(function (mesh) {
    if (mesh.update !== undefined) {
      mesh.update();
    }
  });

  if (enableSkybox) {
    updateSkybox();
  }

  render();

  setCSSWorld();
  setCSSCamera(camera, fovValue);

  updateMarkers();
  updateLegacyMarkers();
  if (updateFediverseLabels) updateFediverseLabels();

  window.rotateX = rotateX;
  window.rotateY = rotateY;
  window.rotateVX = rotateVX;
  window.rotateVY = rotateVY;

  requestAnimationFrame(animate);

  if (camera.easeZooming || translating.easePanning) {
    updateMinimap();

    TWEEN.update();
  }
}

function render() {
  if (enableSkybox) {
    renderSkybox();
  }

  renderer.autoClear = false;
  camera.layers.set(0);

  if (enableSkybox) {
    renderer.clearDepth();
  }

  renderer.render(scene, camera);

  var planet = window.starModel;

  if (planet && planet.visible) {
    syncPlanetCamera();

    if (planet.update) {
      planet.update();
    }

    const planetMesh = planet._planetMesh;
    const useSpotlight = shouldUsePlanetSpotlight(
      planetMesh,
      planetRenderConfig,
    );
    if (window.planetSpotlight) {
      window.planetSpotlight.visible = useSpotlight;
    }
    if (useSpotlight) {
      planet.updateMatrixWorld(true);
      updatePlanetSpotlightTransform(
        window.planetSpotlight,
        planet,
        planetRenderConfig,
      );
    }

    if (window.planetScene) window.planetScene.updateMatrixWorld(true);

    const prevRendererState = applyPlanetRenderConfig(
      renderer,
      THREE,
      planetRenderConfig,
    );
    renderer.clearDepth();
    renderer.render(window.planetScene, window.planetCamera);
    restorePlanetRenderConfig(renderer, prevRendererState);
  }

  camera.layers.enableAll();
  renderer.autoClear = true;
}

function syncPlanetCamera() {
  var planetCamera = window.planetCamera;
  var mainCamera = window.camera;
  var starModel = window.starModel;
  if (!planetCamera || !mainCamera) return;

  var mainZ = mainCamera.position.z;
  var markerMin = window.markerThreshold ? window.markerThreshold.min : 200;

  var modelScale =
    starModel && starModel._currentScale ? starModel._currentScale : 1.0;
  var scaleCompensation = Math.max(1.0, modelScale * 0.5);

  var fadeStart = markerMin * 0.5;
  var fadeEnd = markerMin * 1.2;

  var planetCamZ;
  var opacity = 1.0;

  // 平滑缓动函数 (smoothstep)
  function smoothstep(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  // 近距离区域：直接用 mainZ 线性映射到 planetCamZ
  // mainZ 越小，planetCamZ 越小，星球越大
  if (mainZ < fadeStart) {
    // mainZ: 0.5 ~ 10 是主要缩放区间
    // planetCamZ: 1.5 ~ 6.0 对应星球从大到小
    var minMainZ = 0.5;
    var maxMainZ = 10.0;
    var minPlanetZ = 1.5; // 最近（最大星球）
    var maxPlanetZ = 6.0; // 默认视距（星球更小）

    if (mainZ <= maxMainZ) {
      // 主要缩放区间：线性映射
      var t = (mainZ - minMainZ) / (maxMainZ - minMainZ);
      t = Math.max(0, Math.min(1, t));
      planetCamZ =
        (minPlanetZ + t * (maxPlanetZ - minPlanetZ)) * scaleCompensation;
    } else {
      // mainZ > 10: 从默认逐渐过渡到淡出区
      var t = (mainZ - maxMainZ) / (fadeStart - maxMainZ);
      t = smoothstep(Math.max(0, Math.min(1, t)));
      planetCamZ = (maxPlanetZ + t * 14.0) * scaleCompensation; // 6 -> 20
    }
  } else if (mainZ < fadeEnd) {
    // 过渡区域：星球缩小的同时淡出
    var fadeT = (mainZ - fadeStart) / (fadeEnd - fadeStart);
    var smoothT = smoothstep(fadeT);
    // 从 20 缩小到 60，让星球变得很小再消失
    planetCamZ = (20.0 + smoothT * 40.0) * scaleCompensation;
    opacity = 1.0 - smoothT * smoothT; // 用平方让淡出更晚开始
  } else {
    planetCamZ = 60.0 * scaleCompensation;
    opacity = 0.0;
  }

  planetCamera.position.set(0, 0, planetCamZ);
  planetCamera.lookAt(0, 0, 0);

  if (starModel && starModel._planetMesh) {
    starModel._planetMesh.traverse(function (obj) {
      if (obj.isMesh && obj.material) {
        var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(function (mat) {
          mat.transparent = true;
          mat.opacity = opacity;
        });
      }
    });
  }

  if (window.planetScene) {
    window.planetScene.traverse(function (obj) {
      if (obj.isDirectionalLight) {
        obj.position.set(1, 1, 1);
      }
    });
  }
}

function muteSound() {
  document.getElementById("bgmusicA").volume = 0;
  document.getElementById("bgmusicB").volume = 0;
  if (localStorage) localStorage.setItem("sound", 0);
}

function unmuteSound() {
  document.getElementById("bgmusicA").volume = 1;
  document.getElementById("bgmusicB").volume = 1;
  if (localStorage) localStorage.setItem("sound", 1);
}

window.start = start;
window.starNameEl = starNameEl;
window.detailContainerEl = detailContainerEl;
window.iconNavEl = iconNavEl;
window.spectralGraphEl = spectralGraphEl;
window.muteSound = muteSound;
window.unmuteSound = unmuteSound;
window.firstTime = firstTime;
window.markerThreshold = markerThreshold;

window.addEventListener("load", start);
