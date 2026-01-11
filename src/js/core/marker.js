
import { screenXY } from '../utils/three-helpers.js';
import { constrain } from '../utils/math.js';
import { getZoomByStarRadius, getOffsetByStarRadius } from '../utils/app.js';

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
  var enableFediverse = window.enableFediverse;
  var starSystems = window.starSystems;
  var $starName = window.$starName; 
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
  marker.$ = $(marker); 

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
    marker.$.addClass("label");
  } else {
    var extraData = function () {
      $.get(pathToDetail, function (data) {
        var $body = $("#detailBody").html(data);

        $body.find("a").each(function () {
          var $this = $(this);
          var ahref = $this.attr("href");
          var finalLink = "http://en.wikipedia.org" + ahref;
          $this.attr("href", finalLink);
          $this.attr("target", "blank");
        });

        var $title = $("#detailTitle");
        $title.find("span").html(title);
        var $foot = $("#detailFooter");

        $("#detailContainer").fadeIn();
        $("#css-container").css("display", "none");
        setTimeout(function () {
          var offset =
            $title.outerHeight() + $body.outerHeight() + $foot.outerHeight();
          $("#detailContainer").css({
            paddingTop:
              Math.max(($(window).height() - offset) / 2, line_height * 3) +
              "px",
          });
        }, 0);
      });
    };

    marker.$.hover(
      function (e) {
        var ideal = 20;
        var posAvgRange = 200;
        marker.style.fontSize =
          10 + ideal * (camera.position.z / posAvgRange) + "px";
      },
      function (e) {
        marker.style.fontSize = marker.defaultSize;
      },
    );

    var markerClick = function (e) {
      if (enableFediverse) return;

      var vec = marker.absPosition.clone();

      if (vec.length() !== 0) {
        console.log("show sun button");
        window.showSunButton();
      } else {
        window.hideSunButton();
      }

      window.setMinimap(true);

      $starName.find("span").html(title);
      $starName[0].onclick = extraData;

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
      if (e.originalEvent.touches.length > 1) return;
      markerClick(e);
    };

    marker.$.bind("click", markerClick);
    marker.$.bind("touchstart", markerTouch);
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
    if (enableFediverse) return;
    var vec = marker.absPosition.clone();

    if (enableStarModel == false) return;

    setStarModel(vec, marker.id);
    var modelScale = starModel.scale.length();

    var zoomByStarRadius = getZoomByStarRadius(modelScale);

    var title = nameLayer.innerHTML;
    var offset = getOffsetByStarRadius(modelScale);

    $starName.find("span").html(title);

    $starName[0].onclick = extraData;

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
