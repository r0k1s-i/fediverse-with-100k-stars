import { $, css, fadeIn, fadeOut, trigger, find } from '../utils/dom.js';
import { constrain } from '../utils/math.js';
import * as THREE from 'three';
import { TWEEN } from '../lib/tween.js';

window.THREE = THREE;
window.TWEEN = TWEEN;

import './globals.js';


import './config.js';
import '../utils/misc.js';
import '../utils/three-helpers.js';
import '../utils/app.js';

import { shaderList, loadShaders } from './shaders.js';

import './skybox.js';
import { createSpacePlane } from './plane.js';
import './guides.js';
import { generateDust } from './dust.js';
import { addLensFlare } from './lensflare.js';
import { attachLegacyMarker } from './legacymarkers.js';
import './marker.js';
import './mousekeyboard.js';
import '../core/urlArgs.js';

import './infocallout.js';
import './starsystems.js';
import { makeStarModels } from './starmodel.js';
import { initCSS3D, setCSSWorld, setCSSCamera } from './css3worldspace.js';
import './helphud.js';
import './spacehelpers.js';
import { generateHipparcosStars, loadStarData } from './hipparcos.js';
import { loadFediverseData, generateFediverseInstances } from './fediverse.js';
import './interaction-math.js';
import { initFediverseInteraction, isAtFediverseCenter, shouldShowFediverseSystem, goToFediverseCenter } from './fediverse-interaction.js';
import './label-layout.js';
import { initFediverseLabels, updateFediverseLabels } from './fediverse-labels.js';
import { generateGalaxy } from './galaxy.js';
import './solarsystem.js';
import { makeFediverseSystem } from './fediverse-solarsystem.js';
import './sun.js';
import { Tour, GALAXY_TOUR } from './tour.js';
import { updateMinimap, initializeMinimap, setMinimap } from './minimap.js';

var masterContainer = document.getElementById("visualization");

var maxAniso = 1;
var enableDataStar = true;
var enableSkybox = true;
var enableGalaxy = true;
var enableDust = false;
var enableSolarSystem = true;
var enableSpacePlane = true;
var enableStarModel = true;
var enableTour = true;
var enableDirector = true;

var firstTime = localStorage ? localStorage.getItem("first") == null : true;

var tour = new Tour(GALAXY_TOUR);

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
var spacePlane;
var starModel;

var screenWhalf, screenHhalf;
var divCSSWorld, divCSSCamera;
var fovValue;

var screenWidth;
var screenHeight;

var gradientImage;
var gradientCanvas;

var rtparam = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBFormat,
  stencilBufer: false,
};
var rt;

var antialias = gup("antialias") == 1 ? true : false;

var markerThreshold = {
  min: window.enableFediverse ? 200 : 400,
  max: window.enableFediverse ? 45000 : 1500,
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
  if (window.enableFediverse) {
    loadFediverseData(window.fediverseDataPath, function (loadedData) {
      window.fediverseInstances = loadedData;
      initScene();
      animate();
    });
  } else if (enableDataStar) {
    loadStarData("data/stars_all.json", function (loadedData) {
      starData = loadedData.stars;
      window.starData = starData;
      initScene();
      animate();
    });
  } else {
    initScene();
    animate();
  }
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
  hipparcos: function () {
    camera.position.z = 1840;
  },
  milkyway: function () {
    camera.position.z = 40000;
  },
};

var gui;
var c;

function buildGUI() {
  gui = new dat.GUI();
  gui.domElement.style.display = "none";

  c = gui.add(controllers, "viewSize", 0.01, 4.0);
  c.onChange(function (v) {
    camera.scale.z = v;
  });

  c = gui.add(controllers, "datastarSize", 0.01, 10.0);
  c = gui.add(controllers, "sceneSize", 1, 50000);

  c = gui.add(controllers, "sol");
  c = gui.add(controllers, "solarsystem");
  c = gui.add(controllers, "hipparcos");
  c = gui.add(controllers, "milkyway");

  window.gui = gui;

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

  screenWidth = window.innerWidth;
  screenHeight = window.innerHeight;
  screenWhalf = window.innerWidth / 2;
  screenHhalf = window.innerHeight / 2;

  window.screenWidth = screenWidth;
  window.screenHeight = screenHeight;

  renderer = new THREE.WebGLRenderer({ antialias: antialias });
  window.renderer = renderer;

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
  camera.position.z = window.enableFediverse ? 500 : 2000;
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
    initSkybox(false);
  }

  camera.update = function () {
    if (this.__tour) {
      return;
    }

    if (this.easeZooming) return;

    camera.position.z += (camera.position.target.z - camera.position.z) * 0.125;
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
      displayIntroMessage();
      if (localStorage) localStorage.setItem("first", 0);
    } else {
      _.delay(function () {
        var tourButton = find(iconNavEl, "#tour-button");
        if (tourButton) {
          tourButton.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        }
      }, 500);
    }

    if (window.markers && window.markers.length > 0 && !window.enableFediverse)
      window.markers[0].select();
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
    playPromise.catch(function (error) {
      console.log("Autoplay prevented by browser policy.");
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
    translating.add(starModel);
    window.starModel = starModel;
    window.enableStarModel = enableStarModel;
  }

  if (window.enableFediverse) {
    pSystem = generateFediverseInstances();
    translating.add(pSystem);
  } else if (enableDataStar) {
    pSystem = generateHipparcosStars();
    translating.add(pSystem);
  }
  window.pSystem = pSystem;

  if (enableGalaxy) {
    pGalacticSystem = generateGalaxy();
    translating.add(pGalacticSystem);
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

  if (enableSpacePlane) {
    spacePlane = createSpacePlane();
    translating.add(spacePlane);
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

  if (!camera.__tour) {
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

    var fediverseInteraction = window.fediverseInteraction;

    var isFediverseHover =
      typeof fediverseInteraction !== "undefined" &&
      fediverseInteraction.intersected;

    var atFediverseCenter =
      typeof isAtFediverseCenter === "function" && isAtFediverseCenter();

    var detailDisplay = detailContainerEl ? detailContainerEl.style.display : "none";
    var starNameDisplay = starNameEl ? starNameEl.style.display : "none";
    var starNameOpacity = starNameEl ? parseFloat(starNameEl.style.opacity || 0) : 0;
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
      !isFediverseHover &&
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
      !detailContainerEl.classList.contains("about")
    ) {
      fadeOut(detailContainerEl);
    }

    if (detailDisplay === "none") {
      camera.position.x *= 0.95;
    } else {
      camera.position.x +=
        (camera.position.target.x - camera.position.x) * 0.95;
    }
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

  if (tour.touring || camera.easeZooming || translating.easePanning) {
    updateMinimap();

    TWEEN.update();
  }
}

function render() {
  if (enableSkybox) {
    renderSkybox();
    renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = true;
  } else {
    renderer.render(scene, camera);
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

function displayIntroMessage() {
  Tour.meta.style.display = "block";
  Tour.meta.style.opacity = "1";
  if (window.enableFediverse) {
    tour
      .showMessage("Welcome to the Fediverse Universe.", 5000)
      .showMessage(
        "This is a visualization of Fediverse instances as stars.",
        5000,
      )
      .showMessage("Scroll and zoom to explore.", 4000, function () {
        firstTime = false;
        window.firstTime = false;
        trigger(window, "resize");
        var tourButton = find(iconNavEl, "#tour-button");
        if (tourButton) {
          tourButton.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        }
      })
      .endMessages();
  } else {
    tour
      .showMessage("Welcome to the stellar neighborhood.", 5000)
      .showMessage(
        "This is a visualization of over 100,000 nearby stars.",
        5000,
      )
      .showMessage("Scroll and zoom to explore.", 4000, function () {
        firstTime = false;
        window.firstTime = false;
        trigger(window, "resize");
        var tourButton = find(iconNavEl, "#tour-button");
        if (tourButton) {
          tourButton.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        }
      })
      .endMessages();
  }
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

window.addEventListener('load', start);
