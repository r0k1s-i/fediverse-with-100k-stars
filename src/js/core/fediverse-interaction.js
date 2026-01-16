/**
 * Fediverse Interaction - Mouse interaction handling for Fediverse instances
 *
 * Refactored to use unified InteractionMath for instance detection.
 * @see docs/plans/codebase-optimization-review.md (P0-3)
 */
import * as THREE from "three";
import {
  $,
  css,
  show,
  hide,
  fadeIn,
  fadeOut,
  html,
  find,
  on,
  ready,
} from "../utils/dom.js";
import { InteractionMath } from "./interaction-math.js";

var fediverseInteraction = {
  mouse: new THREE.Vector2(),
  raycaster: new THREE.Raycaster(),
  intersected: null,
  lastHoveredInstance: null,
  clickHandled: false,
  lastClickTime: 0,
  lastViewedInstance: null,
};

var MAJOR_FEDIVERSE_DOMAINS = [
  "mastodon.social",
  "misskey.io",
  "pixelfed.social",
];

var FEDIVERSE_CENTER = { x: 0, y: 0, z: 0 };

export function isMajorFediverseInstance(domain) {
  return MAJOR_FEDIVERSE_DOMAINS.indexOf(domain) !== -1;
}

export function shouldShowFediverseSystem() {
  return (
    fediverseInteraction.lastViewedInstance &&
    isMajorFediverseInstance(fediverseInteraction.lastViewedInstance)
  );
}

export function goToFediverseCenter() {
  var translating = window.translating;
  var camera = window.camera;
  var updateMinimap = window.updateMinimap;

  if (typeof translating !== "undefined") {
    translating.targetPosition.set(
      -FEDIVERSE_CENTER.x,
      -FEDIVERSE_CENTER.y,
      -FEDIVERSE_CENTER.z,
    );
  }
  if (typeof camera !== "undefined") {
    camera.position.target.z = 15;
  }
  if (typeof updateMinimap === "function") {
    updateMinimap();
  }

  var starNameEl = $("#star-name");
  var detailContainerEl = $("#detailContainer");
  var cssContainerEl = $("#css-container");

  if (starNameEl) {
    hide(starNameEl);
    var span = find(starNameEl, "span");
    if (span) html(span, "");
  }
  if (detailContainerEl) {
    fadeOut(detailContainerEl);
  }
  if (cssContainerEl) {
    css(cssContainerEl, { display: "block" });
  }

  fediverseInteraction.intersected = null;

  window._fediverseCenterMode = true;
}

export function isAtFediverseCenter() {
  var translating = window.translating;
  if (!window._fediverseCenterMode) return false;
  if (typeof translating === "undefined") return false;

  var pos = translating.targetPosition || translating.position;
  var distFromCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

  if (distFromCenter > 100) {
    window._fediverseCenterMode = false;
    return false;
  }

  return true;
}

/**
 * Get interaction threshold using unified InteractionMath
 * @returns {number} Current threshold based on camera position
 */
function getInteractionThreshold() {
  var camera = window.camera;
  if (typeof camera === "undefined") {
    return InteractionMath.getDynamicThreshold(null);
  }
  return InteractionMath.getDynamicThreshold(camera.position.z);
}

export function updateFediverseInteraction() {
  var camera = window.camera;
  var markerThreshold = window.markerThreshold;

  if (typeof camera === "undefined") return;

  var isZoomedInClose =
    typeof markerThreshold !== "undefined" &&
    camera.position.z < markerThreshold.min;

  var starModel = window.starModel;
  var enableStarModel = window.enableStarModel;

  if (isZoomedInClose && fediverseInteraction.intersected) {
    var closestInst = fediverseInteraction.intersected.instanceData;

    if (closestInst && typeof starModel !== "undefined" && enableStarModel) {
      var trackedGalaxyPosition =
        starModel.userData && starModel.userData.galaxyPosition;
      var isNewInstance =
        !trackedGalaxyPosition ||
        trackedGalaxyPosition.distanceTo(closestInst.position) > 0.1;
      var needsUpdate = !starModel.visible || isNewInstance;

      if (needsUpdate) {
        if (window.setStarModel) {
          window.setStarModel(closestInst.position, closestInst.name);
        } else {
          starModel.position.copy(closestInst.position);
        }

        var userCount = closestInst.stats ? closestInst.stats.user_count : 1;
        var instanceSize = Math.max(15.0, Math.log(userCount + 1) * 8);
        var MIN_STAR_SCALE = 1.5;
        var modelScale = Math.max(MIN_STAR_SCALE, instanceSize * 0.1);

        var spectralIndex = 0.5;
        if (closestInst.color && closestInst.color.hsl) {
          spectralIndex = closestInst.color.hsl.h / 360;
        }

        starModel.setSpectralIndex(spectralIndex);
        starModel.setScale(modelScale);

        if (typeof starModel.randomizeSolarFlare === "function") {
          starModel.randomizeSolarFlare();
        }

        // Only randomize properties if it's a new instance to prevent flickering
        if (isNewInstance) {
          if (typeof starModel.randomizeRotationSpeed === "function") {
            starModel.randomizeRotationSpeed();
          }

          if (typeof starModel.pickRandomModel === "function") {
            starModel.pickRandomModel();
          }
        }

        starModel.visible = true;
      }
    }
  } else {
    if (starModel) {
      starModel.visible = false;
    }
  }
}

export function initFediverseInteraction() {
  var camera = window.camera;
  if (typeof camera === "undefined") {
    setTimeout(initFediverseInteraction, 500);
    return;
  }

  document.addEventListener("mousemove", onFediverseMouseMove, false);
  document.addEventListener("click", onFediverseClick, true);

  var starNameEl = window.starNameEl || $("#star-name");
  if (starNameEl) {
    starNameEl.addEventListener(
      "click",
      function (event) {
        if (
          fediverseInteraction.intersected ||
          fediverseInteraction.lastHoveredInstance
        ) {
          onFediverseClick(event);
        }
      },
      false,
    );
  }
}

/**
 * Handle mouse movement for instance detection
 *
 * Uses unified InteractionMath.findClosestInstance for all detection.
 * Raycaster mesh detection has been removed to consolidate the interaction path.
 *
 * @param {MouseEvent} event - Mouse move event
 */
function onFediverseMouseMove(event) {
  var camera = window.camera;
  var fediverseInstances = window.fediverseInstances;
  var rotating = window.rotating;
  var translating = window.translating;

  if (typeof camera === "undefined") return;

  // Update normalized device coordinates
  fediverseInteraction.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  fediverseInteraction.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Calculate ray from camera through mouse position
  var vector = new THREE.Vector3(
    fediverseInteraction.mouse.x,
    fediverseInteraction.mouse.y,
    1,
  );
  vector.unproject(camera);

  fediverseInteraction.raycaster.set(
    camera.position,
    vector.sub(camera.position).normalize(),
  );

  var closestInstance = null;

  // Use unified InteractionMath for instance detection
  if (
    typeof fediverseInstances !== "undefined" &&
    typeof rotating !== "undefined" &&
    typeof translating !== "undefined"
  ) {
    rotating.updateMatrixWorld(true);
    translating.updateMatrixWorld(true);

    // Transform ray to local space
    var worldMatrix = translating.matrixWorld.clone();
    var inverseMatrix = new THREE.Matrix4();
    inverseMatrix.copy(worldMatrix).invert();

    var rayOrigin = fediverseInteraction.raycaster.ray.origin.clone();
    rayOrigin.applyMatrix4(inverseMatrix);

    var rayDirection = fediverseInteraction.raycaster.ray.direction.clone();
    var rotationMatrix = new THREE.Matrix4();
    rotationMatrix.extractRotation(inverseMatrix);
    rayDirection.applyMatrix4(rotationMatrix);
    rayDirection.normalize();

    closestInstance = InteractionMath.findClosestInstance(
      rayOrigin,
      rayDirection,
      fediverseInstances,
      getInteractionThreshold(),
    );
  }

  if (closestInstance) {
    handleHover({
      name: closestInstance.name || closestInstance.domain,
      instanceData: closestInstance,
    });
  } else {
    handleHover(null);
  }
}

function handleHover(object) {
  var camera = window.camera;
  var markerThreshold = window.markerThreshold;
  var starNameEl = window.starNameEl || $("#star-name");

  var isZoomedInClose =
    typeof camera !== "undefined" &&
    InteractionMath.isZoomedInClose(camera.position.z, markerThreshold);

  if (fediverseInteraction.intersected && !object) {
    fediverseInteraction.intersected = null;
    document.body.style.cursor = "default";
  }

  if (isZoomedInClose) {
    document.body.style.cursor = "default";
  }

  if (fediverseInteraction.intersected !== object) {
    fediverseInteraction.intersected = object;
    if (object) {
      fediverseInteraction.lastHoveredInstance = object;
    }

    if (!isZoomedInClose) {
      if (object) {
        html(starNameEl, "<span>" + object.name + "</span>");
        css(starNameEl, {
          opacity: "1.0",
          position: "fixed",
          bottom: "auto",
          margin: "0",
        });
        show(starNameEl);
        document.body.style.cursor = "pointer";
      } else {
        hide(starNameEl);
        css(starNameEl, {
          position: "",
          left: "",
          top: "",
          bottom: "",
          margin: "",
        });
        document.body.style.cursor = "default";
      }
    } else {
      if (starNameEl.style.bottom === "auto") {
        hide(starNameEl);
        css(starNameEl, {
          position: "",
          left: "",
          top: "",
          bottom: "",
          margin: "",
        });
      }
    }
  }

  if (
    object &&
    starNameEl &&
    starNameEl.style.display !== "none" &&
    !isZoomedInClose
  ) {
    css(starNameEl, {
      left:
        ((fediverseInteraction.mouse.x + 1) / 2) * window.innerWidth +
        15 +
        "px",
      top:
        (-(fediverseInteraction.mouse.y - 1) / 2) * window.innerHeight +
        15 +
        "px",
    });
  }
}

function isClickOnUI(event) {
  var target = event.target;
  while (target && target !== document.body) {
    var id = target.id || "";
    var className = target.className;
    var classStr =
      typeof className === "string"
        ? className
        : className && className.baseVal
          ? className.baseVal
          : "";
    if (id === "star-name") {
      return false;
    }
    if (
      id === "detailContainer" ||
      id === "detailTitle" ||
      id === "detailBody" ||
      id === "detailClose" ||
      id === "ex-out" ||
      id === "zoom-back" ||
      id === "icon-nav" ||
      id === "minimap" ||
      id === "about" ||
      classStr.indexOf("marker") !== -1 ||
      classStr.indexOf("legacy-marker") !== -1
    ) {
      return true;
    }
    target = target.parentNode;
  }
  return false;
}

function onFediverseClick(event) {
  var setMinimap = window.setMinimap;
  var starModel = window.starModel;
  var enableStarModel = window.enableStarModel;
  var getOffsetByStarRadius = window.getOffsetByStarRadius;
  var centerOn = window.centerOn;
  var zoomIn = window.zoomIn;
  var starNameEl = window.starNameEl || $("#star-name");

  if (isClickOnUI(event)) {
    return;
  }

  var now = Date.now();
  if (now - fediverseInteraction.lastClickTime < 300) {
    return;
  }
  fediverseInteraction.lastClickTime = now;

  var camera = window.camera;
  var markerThreshold = window.markerThreshold;
  var isZoomedInClose =
    typeof camera !== "undefined" &&
    typeof markerThreshold !== "undefined" &&
    camera.position.z < markerThreshold.min;

  var starNameEl = window.starNameEl || $("#star-name");
  var isClickOnStarName =
    starNameEl &&
    (event.target === starNameEl || starNameEl.contains(event.target));

  var clickTarget = null;

  if (isZoomedInClose) {
    if (isClickOnStarName) {
      clickTarget =
        fediverseInteraction.intersected ||
        fediverseInteraction.lastHoveredInstance;
    }
  } else {
    clickTarget = fediverseInteraction.intersected;
  }

  if (!clickTarget) {
    return;
  }

  event.stopPropagation();
  event.preventDefault();

  var data = clickTarget.instanceData || clickTarget;
  if (!data || !data.position) return;

  fediverseInteraction.lastViewedInstance = data.domain || null;

  var position = new THREE.Vector3(
    data.position.x,
    data.position.y,
    data.position.z,
  );

  if (typeof setMinimap === "function") {
    setMinimap(true);
  }

  var userCount = data.stats ? data.stats.user_count : 1;
  var instanceSize = Math.max(15.0, Math.log(userCount + 1) * 8);

  // 星球大小
  var MIN_STAR_SCALE = 1.0;
  var modelScale = Math.max(MIN_STAR_SCALE, instanceSize * 0.08);
  // 跳转视距：默认跳到 mainZ=4-6，对应中等大小星球
  var zoomLevel = Math.min(6.0, Math.max(4.0, modelScale * 2.0));

  if (
    typeof starModel !== "undefined" &&
    typeof enableStarModel !== "undefined" &&
    enableStarModel
  ) {
    // 星球模型放置在实例的位置
    if (window.setStarModel) {
      window.setStarModel(position, data.name);
    } else {
      starModel.position.copy(position);
    }

    var spectralIndex = 0.5;
    if (data.color && data.color.hsl) {
      spectralIndex = data.color.hsl.h / 360;
    }
    starModel.setSpectralIndex(spectralIndex);
    starModel.setScale(modelScale);

    // Check if function exists before calling (GLB model might not have this)
    if (typeof starModel.randomizeSolarFlare === "function") {
      starModel.randomizeSolarFlare();
    }

    // Randomize rotation speed and model choice if available (GLB features)
    if (typeof starModel.randomizeRotationSpeed === "function") {
      starModel.randomizeRotationSpeed();
    }

    if (typeof starModel.pickRandomModel === "function") {
      starModel.pickRandomModel();
    }

    // 确保星球模型可见
    starModel.visible = true;
  }

  var offset = new THREE.Vector3(0, 0, 0);
  if (typeof getOffsetByStarRadius === "function") {
    offset = getOffsetByStarRadius(modelScale);
  }
  var targetPosition = position.clone().add(offset);

  if (typeof centerOn === "function") {
    centerOn(targetPosition);
  }

  if (typeof zoomIn === "function") {
    zoomIn(zoomLevel);
  }

  css(starNameEl, {
    position: "",
    left: "",
    top: "",
    bottom: "",
    margin: "",
  });
  var spanEl = find(starNameEl, "span");
  if (spanEl) html(spanEl, data.name || data.domain);

  showInstanceDetails(data);
}

function showInstanceDetails(data) {
  var starNameEl = $("#star-name");
  if (starNameEl) hide(starNameEl);

  var titleEl = $("#detailTitle span");
  var bodyEl = $("#detailBody");
  var numberWithCommas = window.numberWithCommas;

  if (titleEl) {
    var name = data.name || data.domain;
    titleEl.textContent = name;
    titleEl.title = name;
  }

  var html = '<div style="margin-top: 20px;">';

  if (data.description) {
    html +=
      '<p style="font-style: italic; margin-bottom: 20px;">' +
      data.description +
      "</p>";
  }

  var starType = "Unknown";
  if (data.color && data.color.starType) {
    starType = data.color.starType;
  }
  var softwareName = data.software ? data.software.name : "Unknown";

  html +=
    "<p><strong>Stellar Classification:</strong> " +
    softwareName +
    " · " +
    starType +
    "</p>";

  var temperature = 7300;
  if (data.color && data.color.temperature) {
    temperature = data.color.temperature;
  }
  html +=
    "<p><strong>Surface Temperature:</strong> " +
    (numberWithCommas ? numberWithCommas(temperature) : temperature) +
    "°K</p>";

  if (data.stats) {
    html +=
      "<p><strong>Planetary Population:</strong> " +
      (numberWithCommas
        ? numberWithCommas(data.stats.user_count)
        : data.stats.user_count) +
      "</p>";
  }

  if (data.position) {
    var x = (data.position.x * 10).toFixed(1);
    var y = (data.position.y * 10).toFixed(1);
    var z = (data.position.z * 10).toFixed(1);

    var formatCoord = function (val) {
      return (val >= 0 ? "+" : "") + val;
    };

    html +=
      "<p><strong>Galactic Coordinates:</strong> " +
      "α" +
      formatCoord(x) +
      " · " +
      "β" +
      formatCoord(y) +
      " · " +
      "γ" +
      formatCoord(z) +
      " ly" +
      "</p>";
  }

  if (data.first_seen_at) {
    html +=
      "<p><strong>First Observation:</strong> " +
      new Date(data.first_seen_at).toLocaleDateString() +
      "</p>";
  }

  html += "</div>";

  if (bodyEl) bodyEl.innerHTML = html;

  var instancePortalEl = $("#instance-portal");
  if (instancePortalEl) {
    instancePortalEl.onclick = function (e) {
      e.stopPropagation();
      if (data.domain) {
        window.open("https://" + data.domain, "_blank", "noopener,noreferrer");
      }
    };
  }

  var detailContainerEl = $("#detailContainer");

  // 确保先显示再淡入，强制覆盖之前的状态
  if (detailContainerEl) {
    // 居中逻辑 (参考 marker.js)
    setTimeout(function () {
      var titleContainer = $("#detailTitle");
      var footEl = $("#detailFooter");

      // 使用 titleContainer 而不是 span 以包含 padding/margin
      var titleH = titleContainer
        ? titleContainer.offsetHeight
        : titleEl
          ? titleEl.offsetHeight
          : 60;
      var bodyH = bodyEl ? bodyEl.offsetHeight : 0;
      var footH = footEl ? footEl.offsetHeight : 0;

      var offset = titleH + bodyH + footH;
      var line_height = 20;

      css(detailContainerEl, {
        paddingTop:
          Math.max((window.innerHeight - offset) / 2, line_height * 3) + "px",
      });
    }, 0);

    fadeIn(detailContainerEl);
  }

  css($("#css-container"), { display: "none" });
}

window.fediverseInteraction = fediverseInteraction;
window.initFediverseInteraction = initFediverseInteraction;
window.updateFediverseInteraction = updateFediverseInteraction;
window.shouldShowFediverseSystem = shouldShowFediverseSystem;
window.goToFediverseCenter = goToFediverseCenter;
window.isAtFediverseCenter = isAtFediverseCenter;
window.isMajorFediverseInstance = isMajorFediverseInstance;

ready(function () {
  initFediverseInteraction();
});
