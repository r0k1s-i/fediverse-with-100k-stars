import * as THREE from 'three';
import { screenXY } from '../utils/three-helpers.js';

var legacyMarkers = [];

export function updateLegacyMarkers(){
	for( var i in legacyMarkers ){
		var marker = legacyMarkers[i];
		marker.update();
	}
}

export function attachLegacyMarker( text, obj, size, visibleRange ){
    var camera = window.camera;
    var screenWidth = window.screenWidth;
    var screenHeight = window.screenHeight;

	var template = document.getElementById( 'legacy_marker_template' );

	var marker = template.cloneNode(true);

	marker.obj = obj;
	marker.absPosition = obj.position;
	marker.size = size !== undefined ? size : 1.0;

	marker.visMin = visibleRange === undefined ? 0 : visibleRange.min;
	marker.visMax = visibleRange === undefined ? 10000000 : visibleRange.max;

	var container = document.getElementById('visualization');
	container.appendChild( marker );

	marker.setVisible = function ( vis ){
		if (vis) {
			this.style.opacity = 1.0;
		} else {
			this.style.opacity = 0.0;
		}

		if( vis )
			this.style.visibility = 'visible';
		else
			this.style.visibility = 'hidden';
		return this;
	};

	marker.setSize = function( s ) {
		this.style.fontSize = s + 'px';
	};

	marker.setPosition = function(x,y){
		x -= this.markerWidth * 0.5;
		this.style.left = x + 'px';
		this.style.top = y + 'px';	
	};

	var nameLayer = marker.children[0];
	marker.nameLayer = nameLayer;
	nameLayer.innerHTML = text;
	marker.markerWidth = marker.offsetWidth;

	marker.zero = new THREE.Vector3();
	marker.update = function() {

		var screenPos = screenXY(this.obj);

		var inCamRange = (camera.position.z > this.visMin && camera.position.z < this.visMax);
		var inCamFrame = (screenPos.x > 0 && screenPos.x < screenWidth && screenPos.y > 0 && screenPos.y < screenHeight);
		var isParentVisible = this.obj.visible;
		if (isParentVisible) {
			var currentObj = this.obj.parent;
			while (currentObj) {
				if (!currentObj.visible) {
					isParentVisible = false;
					break;
				}
				currentObj = currentObj.parent;
			}
		}

		if( isParentVisible && inCamRange )
			this.setPosition( screenPos.x, screenPos.y );

		if( inCamRange && inCamFrame && isParentVisible )
			this.setVisible( true );
		else
			this.setVisible( false );
            
        this.style.pointerEvents = "none";
	};	

	legacyMarkers.push( marker );

}

window.updateLegacyMarkers = updateLegacyMarkers;
window.attachLegacyMarker = attachLegacyMarker;
