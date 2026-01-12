import { screenXY } from '../utils/three-helpers.js';
import { constrain } from '../utils/math.js';
import { getZoomByStarRadius, getOffsetByStarRadius } from '../utils/app.js';
import { $, addClass, css, fadeIn, find, html, on } from '../utils/dom.js';

var markers = [];

export function updateMarkers() {
  for (var i in markers) {
    var marker = markers[i];
    marker.update();
  }
}

export function attachMarker(obj, size) {
  var camera = window.camera;
  var markerThreshold = window.markerThreshold;
  var starSystems = window.starSystems;
  var starNameEl = window.starNameEl;
  var setStarModel = window.setStarModel;
  var starModel = window.starModel;
  var enableStarModel = window.enableStarModel;
  var zoomIn = window.zoomIn;
  var centerOn = window.centerOn;
  var snapTo = window.snapTo;
  var setDivPosition = window.setDivPosition;

  var padding = 3;
  var line_height = 20;
  var title, extraData;
  var container = document.getElementById("css-camera");
  var template = document.getElementById("marker_template");
  var marker = template.cloneNode(true);

  obj.name = obj.name.replace("'", "");

  marker.obj = obj;
  marker.absPosition = obj.position;
  marker.size = size !== undefined ? size : 1.0;
  marker.id = obj.name;
  marker.style.fontSize = 24 + "px";

  marker.spectralIndex = obj.spectralIndex;

  setDivPosition(marker, obj);

  var nameLayer = marker.children[0];

  var system = starSystems ? starSystems[obj.name] : undefined;

  if (system !== undefined) {
    var systemName = system.name;
    nameLayer.innerHTML = systemName;
  } else {
    nameLayer.innerHTML = obj.name;
  }

  if (
    obj.name === "Proxima Centauri" ||
    obj.name === "Rigel Kentaurus A" ||
    obj.name === "Rigel Kentaurus B"
  )
    marker.style.fontSize = 10 + "px";

  if (obj.name === "Rigel Kentaurus B") return;

  if (obj.name === "Rigel Kentaurus A") nameLayer.innerHTML = "Alpha Centauri";

  marker.defaultSize = marker.style.fontSize;

  var name = marker.id.toLowerCase();
  title = nameLayer.innerHTML;

  var fileName = name.replace(/ /g, "_");
  var pathToDetail = encodeURI("detail/" + fileName + ".html");

  var obj_name = obj.name.match("°");

  if (obj_name && obj_name[0] == "°") {
    addClass(marker, "label");
  } else {
    var extraData = function () {
      fetch(pathToDetail)
        .then(function(response) { return response.text(); })
        .then(function(data) {
          var bodyEl = $("#detailBody");
          html(bodyEl, data);

          var links = bodyEl.querySelectorAll('a');
          links.forEach(function(link) {
            var ahref = link.getAttribute("href");
            var finalLink = "http://en.wikipedia.org" + ahref;
            link.setAttribute("href", finalLink);
            link.setAttribute("target", "blank");
          });

          var titleEl = $("#detailTitle");
          var titleSpan = find(titleEl, 'span');
          if (titleSpan) html(titleSpan, title);
          var footEl = $("#detailFooter");

          fadeIn($("#detailContainer"));
          css($("#css-container"), { display: "none" });
          setTimeout(function () {
            var offset =
              titleEl.offsetHeight + bodyEl.offsetHeight + footEl.offsetHeight;
            css($("#detailContainer"), {
              paddingTop:
                Math.max((window.innerHeight - offset) / 2, line_height * 3) +
                "px",
            });
          }, 0);
        });
    };

    marker.addEventListener('mouseenter', function(e) {
      var ideal = 20;
      var posAvgRange = 200;
      marker.style.fontSize =
        10 + ideal * (camera.position.z / posAvgRange) + "px";
    });
    
    marker.addEventListener('mouseleave', function(e) {
      marker.style.fontSize = marker.defaultSize;
    });

    var markerClick = function (e) {
      window.setMinimap(true);

      var spanEl = find(starNameEl, 'span');
      if (spanEl) html(spanEl, title);
      starNameEl.onclick = extraData;

      extraData();

      var isStarSystem = system !== undefined;

      if (isStarSystem) {
        setStarModel(vec, marker.id);
        var modelScale = starModel.scale.length();

        var zoomByStarRadius = getZoomByStarRadius(modelScale);
        zoomIn(zoomByStarRadius);

        var offset = getOffsetByStarRadius(modelScale);
        vec.add(offset);
      }

      centerOn(vec);
    };

    var markerTouch = function (e) {
      if (e.touches.length > 1) return;
      markerClick(e);
    };

    marker.addEventListener("click", markerClick);
    marker.addEventListener("touchstart", markerTouch);
  }

  container.appendChild(marker);

  marker.setVisible = function (vis) {
    if (vis) {
      this.style.opacity = 1.0;
    } else {
      this.style.opacity = 0.0;
    }
    return this;
  };

  marker.select = function () {
    var vec = marker.absPosition.clone();

    if (enableStarModel == false) return;

    setStarModel(vec, marker.id);
    var modelScale = starModel.scale.length();

    var zoomByStarRadius = getZoomByStarRadius(modelScale);

    var title = nameLayer.innerHTML;
    var offset = getOffsetByStarRadius(modelScale);

    var spanEl = find(starNameEl, 'span');
    if (spanEl) html(spanEl, title);

    starNameEl.onclick = extraData;

    vec.add(offset);
    snapTo(vec);
  };

  marker.setSize = function (s) {
    this.style.fontSize = s + "px";
    this.style.lineHeight = s + "px";
    this.style.marginTop = -(s + padding) / 2 + "px";
  };

  var countryLayer = marker.querySelector("#startText");
  marker.countryLayer = countryLayer;

  marker.update = function () {
    var s = (0.05 + camera.position.z / 2000) * this.size;
    s = constrain(s, 0, 1);

    setDivPosition(this, this.obj, s);
    this.setVisible(camera.markersVisible);
  };

  markers.push(marker);
}

window.updateMarkers = updateMarkers;
window.attachMarker = attachMarker;
window.markers = markers;
