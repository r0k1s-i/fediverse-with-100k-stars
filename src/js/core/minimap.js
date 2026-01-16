import { map, constrain } from "../utils/math.js";
import {
  $,
  css,
  addClass,
  fadeIn,
  fadeOut,
  find,
  html,
  on,
  ajax,
} from "../utils/dom.js";
import { ensureCameraTarget } from "../utils/app.js";

import { state } from "./state.js";

var border_width = 1;
var padding = 80;

var ready = false;
var active = false;
var count = 0;
var timer = null;
var dragged = false;
var isDestroyed = false;

var soundOnEl, soundOffEl, heatvisionEl, homeEl, tourEl;

var domElement = $("#minimap");
var minimapEl = find(domElement, "#zoom-levels");
var volumeEl = find(domElement, "#volume");
var aboutEl = find(domElement, "#about");
var gridViewEl = find(domElement, "#grid-view");
var cursorEl = find(domElement, "#zoom-cursor");

var POWER = 3;
var position = 0;
var curve = function (t) {
  return Math.pow(t, 1 / POWER);
};
var curve_inverse = function (t) {
  return Math.pow(t, POWER);
};

function clickEvent(e) {
  var id = e.target.id || "";

  if (
    dragged ||
    (id !== "css-world" && id !== "css-camera" && id !== "glContainer")
  ) {
    dragged = false;
    return;
  }

  unfocus();
}

function touchEvent(e) {
  var id = e.target.id || "";

  if (
    dragged ||
    (id !== "css-world" && id !== "css-camera" && id !== "glContainer")
  ) {
    dragged = false;
    return;
  }

  unfocus();
}

function onResize() {
  var firstTime = window.firstTime;
  if (!ready) {
    if (timer) {
      updateCount();
      clearTimeout(timer);
    }
    timer = setTimeout(function () {
      // Force loop to run regardless of firstTime to ensure minimap appears
      if (active) window.dispatchEvent(new Event("resize"));
    }, 500);

    return;
  }

  var volumeHeight = volumeEl ? volumeEl.offsetHeight || 24 : 24;
  var aboutHeight = aboutEl ? aboutEl.offsetHeight || 24 : 24;
  var gridViewHeight = gridViewEl ? gridViewEl.offsetHeight || 24 : 24;
  var offset = volumeHeight + aboutHeight + gridViewHeight + padding;
  var h = domElement ? domElement.offsetHeight - offset : 0;

  if (minimapEl) {
    minimapEl.style.height = h - border_width * 2 + "px";
  }

  if (domElement && !domElement.classList.contains("ready") && active) {
    addClass(domElement, "ready");
  }
}

function onAboutClick(e) {
  var detailContainerEl = window.detailContainerEl || $("#detailContainer");

  var line_height = 20;
  e.preventDefault();

  if (detailContainerEl) {
    addClass(detailContainerEl, "about");
  }

  css($("#css-container"), { display: "none" });

  fetch("detail/about.html")
    .then(function (response) {
      return response.text();
    })
    .then(function (data) {
      html($("#detailBody"), data);
    });

  var titleSpan = find($("#detailTitle"), "span");
  if (titleSpan) html(titleSpan, "100,000 Stars");

  if (detailContainerEl) {
    css(detailContainerEl, { paddingTop: line_height * 3 + "px" });
    fadeIn(detailContainerEl);
  }
}

function onGridViewClick(e) {
  e.preventDefault();
  var goToGridView = window.goToGridView;
  if (goToGridView) goToGridView();
}

function onSoundOnClick(e) {
  e.preventDefault();
  if (soundOnEl) css(soundOnEl, { display: "none" });
  var muteSound = window.muteSound;
  if (muteSound) muteSound();
  if (soundOffEl) {
    css(soundOffEl, { display: "inline-block" });
  }
}

function onSoundOffClick(e) {
  e.preventDefault();
  if (soundOffEl) css(soundOffEl, { display: "none" });
  var unmuteSound = window.unmuteSound;
  if (unmuteSound) unmuteSound();
  if (soundOnEl) {
    css(soundOnEl, { display: "inline-block" });
  }
}

function onHeatVisionClick(e) {
  e.preventDefault();
  var toggleHeatVision = window.toggleHeatVision;
  if (toggleHeatVision) toggleHeatVision();
}

function onHeatVisionEnter(e) {
  if (tourEl)
    tourEl.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
}

function onHeatVisionLeave(e) {
  if (tourEl)
    tourEl.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
}

window.addEventListener("resize", onResize);

window.addEventListener("click", clickEvent);
window.addEventListener("mouseup", onWindowMouseUp);
window.addEventListener("touchend", onWindowMouseUp);
window.dispatchEvent(new Event("resize"));

export function destroyMinimap() {
  isDestroyed = true;
  window.removeEventListener("resize", onResize);
  window.removeEventListener("click", clickEvent);
  window.removeEventListener("mouseup", onWindowMouseUp);
  window.removeEventListener("touchend", onWindowMouseUp);
  window.removeEventListener("mousemove", drag);
  window.removeEventListener("touchmove", dragTouch);

  if (minimapEl) {
    minimapEl.removeEventListener("mousedown", onElementMouseDown);
    minimapEl.removeEventListener("touchstart", onElementTouchStart);
  }

  if (aboutEl) {
    aboutEl.removeEventListener("click", onAboutClick);
  }

  if (gridViewEl) {
    gridViewEl.removeEventListener("click", onGridViewClick);
  }

  if (soundOnEl) {
    soundOnEl.removeEventListener("click", onSoundOnClick);
  }

  if (soundOffEl) {
    soundOffEl.removeEventListener("click", onSoundOffClick);
  }

  if (heatvisionEl) {
    heatvisionEl.removeEventListener("click", onHeatVisionClick);
    heatvisionEl.removeEventListener("mouseenter", onHeatVisionEnter);
    heatvisionEl.removeEventListener("mouseleave", onHeatVisionLeave);
  }
}

export function initializeMinimap() {
  updateMinimap();
}

export function activateMinimap() {
  active = true;
  window.dispatchEvent(new Event("resize"));
}

export function updateMinimap() {
  var camera = state.camera;

  if (!camera) {
    return;
  }

  ensureCameraTarget(camera);

  // Ensure camera.position.target exists, otherwise fallback to camera.position
  var targetZ =
    camera.position.target && camera.position.target.z
      ? camera.position.target.z
      : camera.position.z;

  var normal = cmap(targetZ, 1.1, 40000, 0, 1);
  position = cmap(curve(normal), 0, 1, 0, 100);
  updateCursorPosition(true);
}

export function setScrollPositionFromTouch(touch) {
  var minimapRect = minimapEl
    ? minimapEl.getBoundingClientRect()
    : { top: 0, height: 1 };
  var y = touch.pageY - minimapRect.top;
  var height = minimapEl ? minimapEl.offsetHeight : 1;
  position = cmap(y, 0, height, 0, 100);
  updateCursorPosition();
}

export function setMinimap(b) {
  dragged = !!b;
}

if (minimapEl) {
  minimapEl.addEventListener("mousedown", onElementMouseDown);
  minimapEl.addEventListener("touchstart", onElementTouchStart);
}

if (aboutEl) {
  aboutEl.addEventListener("click", onAboutClick);
}

if (gridViewEl) {
  gridViewEl.addEventListener("click", onGridViewClick);
}

var muted = localStorage.getItem("sound") === "0";

fetch("src/assets/icons/sound-on.svg")
  .then(function (response) {
    return response.text();
  })
  .then(function (resp) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(resp, "image/svg+xml");
    soundOnEl = doc.querySelector("svg");
    if (soundOnEl && !isDestroyed) {
      addClass(soundOnEl, "icon");
      css(soundOnEl, { display: muted ? "none" : "block" });
      soundOnEl.addEventListener("click", onSoundOnClick);
      if (volumeEl) volumeEl.appendChild(soundOnEl);
      updateCount();
    }
  });

fetch("src/assets/icons/sound-off.svg")
  .then(function (response) {
    return response.text();
  })
  .then(function (resp) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(resp, "image/svg+xml");
    soundOffEl = doc.querySelector("svg");
    if (soundOffEl && !isDestroyed) {
      addClass(soundOffEl, "icon");
      css(soundOffEl, { display: !muted ? "none" : "block" });
      soundOffEl.addEventListener("click", onSoundOffClick);
      if (volumeEl) volumeEl.appendChild(soundOffEl);
      updateCount();
    }
  });

loadHeatVisionIcon();

function loadHeatVisionIcon() {
  fetch("src/assets/icons/heat-vision.svg")
    .then(function (response) {
      return response.text();
    })
    .then(function (resp) {
      var iconNavEl = window.iconNavEl || $("#icon-nav");

      var parser = new DOMParser();
      var doc = parser.parseFromString(resp, "image/svg+xml");
      heatvisionEl = doc.querySelector("svg");
      if (heatvisionEl && !isDestroyed) {
        addClass(heatvisionEl, "icon");
        heatvisionEl.setAttribute("data-tip", "Toggle Spectral Index.");
        heatvisionEl.addEventListener("click", onHeatVisionClick);
        heatvisionEl.addEventListener("mouseenter", onHeatVisionEnter);
        heatvisionEl.addEventListener("mouseleave", onHeatVisionLeave);
        if (iconNavEl) iconNavEl.appendChild(heatvisionEl);
      }
    });
}

function onElementMouseDown(e) {
  var minimapRect = minimapEl ? minimapEl.getBoundingClientRect() : { top: 0 };
  var y = e.pageY - minimapRect.top;
  var height = minimapEl ? minimapEl.offsetHeight : 1;
  position = cmap(y, 0, height, 0, 100);

  updateCursorPosition();

  window.addEventListener("mousemove", drag);
}

function onElementTouchStart(e) {
  var touch = e.touches[0];
  var minimapRect = minimapEl ? minimapEl.getBoundingClientRect() : { top: 0 };
  var y = touch.pageY - minimapRect.top;
  var height = minimapEl ? minimapEl.offsetHeight : 1;
  position = cmap(y, 0, height, 0, 100);

  updateCursorPosition();
  window.scrollbaring = true;
}

function drag(e) {
  var minimapRect = minimapEl ? minimapEl.getBoundingClientRect() : { top: 0 };
  var y = e.pageY - minimapRect.top;
  var height = minimapEl ? minimapEl.offsetHeight : 1;
  position = cmap(y, 0, height, 0, 100);

  updateCursorPosition();
}

function dragTouch(e) {
  if (e.touches.length != 1) return;
}

function onWindowMouseUp(e) {
  window.removeEventListener("mousemove", drag);
  window.removeEventListener("touchmove", dragTouch);
}

function updateCursorPosition(silent) {
  if (cursorEl) {
    css(cursorEl, { top: position + "%" });
  }
  if (!silent) {
    updateCameraPosition();
  }
}

function updateCameraPosition() {
  var camera = state.camera;

  if (camera) {
    ensureCameraTarget(camera);
    var normal = position / 100;
    camera.position.target.z = cmap(curve_inverse(normal), 0, 1, 1.1, 40000);
    camera.position.target.pz = camera.position.target.z;
  }
}

function cmap(v, i1, i2, o1, o2) {
  return Math.max(Math.min(map(v, i1, i2, o1, o2), o2), o1);
}

function unfocus(home) {
  var zoomOut = window.zoomOut;
  var shouldShowFediverseSystem = window.shouldShowFediverseSystem;
  var goToFediverseCenter = window.goToFediverseCenter;
  var fediverseInteraction = window.fediverseInteraction;

  fadeOut($("#detailContainer"));
  css($("#css-container"), { display: "block" });
  if (!!home) {
    if (
      typeof shouldShowFediverseSystem === "function" &&
      shouldShowFediverseSystem()
    ) {
      goToFediverseCenter();
      if (typeof fediverseInteraction !== "undefined") {
        fediverseInteraction.lastViewedInstance = null;
      }
    } else {
      if (zoomOut) zoomOut(555);
    }
  }
}

function updateCount() {
  if (count < 3) {
    count++;
  } else if (!ready) {
    ready = true;
  }
}

window.initializeMinimap = initializeMinimap;
window.activateMinimap = activateMinimap;
window.updateMinimap = updateMinimap;
window.setScrollPositionFromTouch = setScrollPositionFromTouch;
window.setMinimap = setMinimap;
window.destroyMinimap = destroyMinimap;
