import { constrain } from '../utils/math.js';

var markers = [];

export function updateMarkers() {
  for (var i in markers) {
    var marker = markers[i];
    marker.update();
  }
}

window.updateMarkers = updateMarkers;
window.markers = markers;
