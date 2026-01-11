var fediverseInteraction = {
  mouse: new THREE.Vector2(),
  raycaster: new THREE.Raycaster(),
  intersected: null,
  baseThreshold: 100.0,
  clickHandled: false,
  lastClickTime: 0,
  lastViewedInstance: null,  // Track the last viewed instance
};

// Three major Fediverse platforms
var MAJOR_FEDIVERSE_DOMAINS = [
  "mastodon.social",
  "misskey.io",
  "pixelfed.social"
];

// Center position of the three major instances (calculated average)
var FEDIVERSE_CENTER = { x: 0, y: 0, z: 0 };

function isMajorFediverseInstance(domain) {
  return MAJOR_FEDIVERSE_DOMAINS.indexOf(domain) !== -1;
}

function shouldShowFediverseSystem() {
  return fediverseInteraction.lastViewedInstance && 
         isMajorFediverseInstance(fediverseInteraction.lastViewedInstance);
}

function goToFediverseCenter() {
  if (typeof translating !== "undefined") {
    translating.targetPosition.set(
      -FEDIVERSE_CENTER.x,
      -FEDIVERSE_CENTER.y,
      -FEDIVERSE_CENTER.z
    );
  }
  if (typeof camera !== "undefined") {
    camera.position.target.z = 15; // Zoom level to see the software ecosystem
  }
  if (typeof updateMinimap === "function") {
    updateMinimap();
  }
  if (typeof window.hideSunButton === "function") {
    window.hideSunButton();
  }
  
  // Hide UI elements that might be left over from viewing an instance
  var $starName = $("#star-name");
  var $detailContainer = $("#detailContainer");
  var $cssContainer = $("#css-container");
  
  if ($starName.length) {
    $starName.hide(); // Immediately hide instead of fadeOut to prevent border showing
    $starName.find("span").html(""); // Clear the star name content
  }
  if ($detailContainer.length) {
    $detailContainer.fadeOut();
  }
  if ($cssContainer.length) {
    $cssContainer.css("display", "block");
  }
  
  // Clear any hover state
  fediverseInteraction.intersected = null;
  
  // Set flag to indicate we are viewing the Fediverse software ecosystem center
  window._fediverseCenterMode = true;
}

// Check if camera is at Fediverse center (near origin with appropriate zoom)
function isAtFediverseCenter() {
  if (!window._fediverseCenterMode) return false;
  if (typeof translating === "undefined") return false;
  
  var pos = translating.targetPosition || translating.position;
  var distFromCenter = Math.sqrt(
    pos.x * pos.x + pos.y * pos.y + pos.z * pos.z
  );
  
  // If we moved away from center, clear the flag
  if (distFromCenter > 100) {
    window._fediverseCenterMode = false;
    return false;
  }
  
  return true;
}

function getInteractionThreshold() {
  if (typeof camera === "undefined") {
    return fediverseInteraction.baseThreshold;
  }

  var z = Math.abs(camera.position.z);

  // Linear dynamic threshold: ~3% of screen height
  var dynamicThreshold = z * 0.025;

  // Small minimum to ensure usability, but NOT the large baseThreshold
  // which caused the "black hole" effect at origin when zoomed in
  var MIN_THRESHOLD = 5.0;

  return Math.max(MIN_THRESHOLD, dynamicThreshold);
}

function initFediverseInteraction() {
  if (typeof camera === "undefined") {
    setTimeout(initFediverseInteraction, 500);
    return;
  }

  document.addEventListener("mousemove", onFediverseMouseMove, false);
  document.addEventListener("click", onFediverseClick, true);
}

function onFediverseMouseMove(event) {
  if (!enableFediverse) return;
  if (typeof camera === "undefined") return;

  fediverseInteraction.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  fediverseInteraction.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  var vector = new THREE.Vector3(
    fediverseInteraction.mouse.x,
    fediverseInteraction.mouse.y,
    1,
  );
  projector.unprojectVector(vector, camera);

  fediverseInteraction.raycaster.set(
    camera.position,
    vector.sub(camera.position).normalize(),
  );

  var intersects = fediverseInteraction.raycaster.intersectObjects(
    fediverseMeshes,
    true,
  );

  if (intersects.length > 0) {
    for (var i = 0; i < intersects.length; i++) {
      if (intersects[i].object.visible) {
        handleHover(intersects[i].object.parent);
        return;
      }
    }
  }

  var closestInstance = null;

  if (
    typeof fediverseInstances !== "undefined" &&
    typeof InteractionMath !== "undefined" &&
    typeof rotating !== "undefined"
  ) {
    // Transform ray from world space to local space (accounting for rotating + translating)
    // The scene hierarchy is: rotating -> translating -> instances
    // We need the inverse of this transform to convert ray to local coordinates

    rotating.updateMatrixWorld(true);
    translating.updateMatrixWorld(true);

    // Get the combined world matrix of translating (includes rotating's transform)
    var worldMatrix = translating.matrixWorld.clone();
    var inverseMatrix = new THREE.Matrix4();
    inverseMatrix.getInverse(worldMatrix);

    // Transform ray origin to local space
    var rayOrigin = fediverseInteraction.raycaster.ray.origin.clone();
    rayOrigin.applyMatrix4(inverseMatrix);

    // Transform ray direction to local space (rotation only, no translation)
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
  // When zoomed in very close (like original star view), don't show hover tooltip
  // The star name is shown in the fixed bottom-left position by main.js
  var isZoomedInClose =
    typeof camera !== "undefined" &&
    typeof markerThreshold !== "undefined" &&
    camera.position.z < markerThreshold.min;

  if (isZoomedInClose) {
    // When zoomed in close, don't interfere with the standard star name display
    // Clear any hover state
    if (fediverseInteraction.intersected) {
      fediverseInteraction.intersected = null;
      document.body.style.cursor = "default";
    }
    return;
  }

  if (fediverseInteraction.intersected !== object) {
    fediverseInteraction.intersected = object;

    if (object) {
      $starName.html("<span>" + object.name + "</span>");
      // Use inline styles for tooltip mode (following mouse)
      $starName
        .css({
          opacity: 1.0,
          position: "fixed",
          bottom: "auto",
          margin: 0,
        })
        .show();
      document.body.style.cursor = "pointer";
    } else {
      $starName.hide();
      // Reset to default CSS positioning when not hovering
      $starName.css({
        position: "",
        left: "",
        top: "",
        bottom: "",
        margin: "",
      });
      document.body.style.cursor = "default";
    }
  }

  if (object && $starName.is(":visible")) {
    $starName.css({
      left: ((fediverseInteraction.mouse.x + 1) / 2) * window.innerWidth + 15,
      top: (-(fediverseInteraction.mouse.y - 1) / 2) * window.innerHeight + 15,
    });
  }
}

function isClickOnUI(event) {
  var target = event.target;
  while (target && target !== document.body) {
    var id = target.id || "";
    var className = target.className || "";
    if (
      id === "detailContainer" ||
      id === "detailTitle" ||
      id === "detailBody" ||
      id === "detailClose" ||
      id === "ex-out" ||
      id === "zoom-back" ||
      id === "icon-nav" ||
      // NOTE: Removed css-container and css-camera - these are the 3D scene containers and should allow clicks
      // id === "css-container" ||
      // id === "css-camera" ||
      id === "minimap" ||
      id === "about" ||
      className.indexOf("marker") !== -1 ||
      className.indexOf("legacy-marker") !== -1
    ) {
      return true;
    }
    target = target.parentNode;
  }
  return false;
}

function onFediverseClick(event) {
  if (!enableFediverse) return;

  if (isClickOnUI(event)) {
    return;
  }

  var now = Date.now();
  if (now - fediverseInteraction.lastClickTime < 300) return;
  fediverseInteraction.lastClickTime = now;

  // Check if we're zoomed in close
  var isZoomedInClose =
    typeof camera !== "undefined" &&
    typeof markerThreshold !== "undefined" &&
    camera.position.z < markerThreshold.min;

  var clickTarget = null;

  if (isZoomedInClose) {
    // When zoomed in close, ONLY allow clicking on the current instance
    // Don't allow jumping to other instances - bad UX
    if (typeof translating !== "undefined") {
      // Use targetPosition if available (more accurate than animated position)
      var transPos = translating.targetPosition || translating.position;
      var currentPos = transPos.clone().negate();

      // Find the closest instance to current position
      var closestDist = Infinity;
      var closestInst = null;

      if (typeof fediverseInstances !== "undefined") {
        for (var i = 0; i < fediverseInstances.length; i++) {
          var inst = fediverseInstances[i];
          if (inst.position) {
            var dist = Math.sqrt(
              Math.pow(inst.position.x - currentPos.x, 2) +
                Math.pow(inst.position.y - currentPos.y, 2) +
                Math.pow(inst.position.z - currentPos.z, 2),
            );
            if (dist < closestDist) {
              closestDist = dist;
              closestInst = inst;
            }
          }
        }
      }

      // Only accept if very close (threshold 10)
      if (closestInst && closestDist < 10) {
        clickTarget = {
          name: closestInst.name || closestInst.domain,
          instanceData: closestInst,
        };
      }
    }
  } else {
    // When zoomed out, use the hover-selected instance
    clickTarget = fediverseInteraction.intersected;
  }

  if (!clickTarget) {
    return;
  }

  event.stopPropagation();
  event.preventDefault();

  var data = clickTarget.instanceData || clickTarget;
  if (!data || !data.position) return;

  // Track the viewed instance domain for return navigation
  fediverseInteraction.lastViewedInstance = data.domain || null;

  var position = new THREE.Vector3(
    data.position.x,
    data.position.y,
    data.position.z,
  );

  if (position.length() > 0.001) {
    if (typeof window.showSunButton === "function") {
      window.showSunButton();
    }
  } else {
    if (typeof window.hideSunButton === "function") {
      window.hideSunButton();
    }
  }

  if (typeof window.setMinimap === "function") {
    window.setMinimap(true);
  }

  var userCount = data.stats ? data.stats.user_count : 1;
  var instanceSize = Math.max(15.0, Math.log(userCount + 1) * 8);

  var MIN_STAR_SCALE = 1.5;
  var modelScale = Math.max(MIN_STAR_SCALE, instanceSize * 0.1);
  // Clamp zoomLevel to keep consistent visual size regardless of star scale
  var zoomLevel = Math.min(3.0, Math.max(1.5, modelScale * 0.8));

  if (
    typeof starModel !== "undefined" &&
    typeof enableStarModel !== "undefined" &&
    enableStarModel
  ) {
    starModel.position.copy(position);

    var spectralIndex = 0.5;
    if (data.color && data.color.hsl) {
      spectralIndex = data.color.hsl.h / 360;
    }
    starModel.setSpectralIndex(spectralIndex);
    starModel.setScale(modelScale);
    starModel.randomizeSolarFlare();
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

  // Reset $starName to default CSS positioning (bottom-left fixed)
  // This allows main.js to control its visibility based on zoom level
  $starName.css({
    position: "",
    left: "",
    top: "",
    bottom: "",
    margin: "",
  });
  $starName.find("span").html(data.name || data.domain);

  showInstanceDetails(data);
}

function showInstanceDetails(data) {
  var $title = $("#detailTitle span");
  var $body = $("#detailBody");

  $title.text(data.name || data.domain);

  var html = '<div style="margin-top: 20px;">';

  // 描述放在最前面
  if (data.description) {
    html +=
      '<p style="font-style: italic; margin-bottom: 20px;">' +
      data.description +
      "</p>";
  }

  // 星球类型：软件名 + 星球类型（直接从数据读取）
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

  // 星球温度（直接从数据读取）
  var temperature = 7300; // 默认中等温度
  if (data.color && data.color.temperature) {
    temperature = data.color.temperature;
  }
  html +=
    "<p><strong>Surface Temperature:</strong> " +
    numberWithCommas(temperature) +
    "°K</p>";

  // 星球居民数（原Total Users）
  if (data.stats) {
    html +=
      "<p><strong>Planetary Population:</strong> " +
      numberWithCommas(data.stats.user_count) +
      "</p>";
  }

  // 宇宙坐标
  if (data.position) {
    // 换算为科学描述，使用光年作为单位（1单位 ≈ 10光年）
    var x = (data.position.x * 10).toFixed(1);
    var y = (data.position.y * 10).toFixed(1);
    var z = (data.position.z * 10).toFixed(1);

    // 格式化坐标，正数用+号，负数用-号
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

  $body.html(html);

  // 设置 ↗ 符号的点击事件（跳转到实例）
  var $instancePortal = $("#instance-portal");
  $instancePortal.off("click").on("click", function (e) {
    e.stopPropagation();
    if (data.domain) {
      window.open("https://" + data.domain, "_blank", "noopener,noreferrer");
    }
  });

  $detailContainer.fadeIn();
  $("#css-container").css("display", "none");
}

$(document).ready(function () {
  initFediverseInteraction();
});
