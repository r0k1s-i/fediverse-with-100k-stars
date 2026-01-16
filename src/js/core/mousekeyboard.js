import { constrain } from "../utils/math.js";
import { CAMERA } from "./constants.js";

var mouseX = 0,
  mouseY = 0,
  pmouseX = 0,
  pmouseY = 0;
var pressX = 0,
  pressY = 0;

var dragging = false;
var scrollbaring = false;

var rotateX = 0,
  rotateY = 0;
var rotateVX = 0,
  rotateVY = 0;
var rotateXMax = (90 * Math.PI) / 180;

var rotateTargetX = undefined;
var rotateTargetY = undefined;

var keyboard = new THREEx.KeyboardState();

var TOUCHMODES = {
  NONE: 0,
  SINGLE: 1,
  DOUBLE: 2,
};
var touchMode = TOUCHMODES.NONE;
var previousTouchDelta = 0;
var touchDelta = 0;

export function onDocumentMouseMove(event) {
  if (touchMode != TOUCHMODES.NONE) {
    event.preventDefault();
    return;
  }

  pmouseX = mouseX;
  pmouseY = mouseY;

  mouseX = event.clientX - window.innerWidth * 0.5;
  mouseY = event.clientY - window.innerHeight * 0.5;

  if (dragging) {
    doCameraRotationFromInteraction();
    if (window.setMinimap) window.setMinimap(dragging);
  }
}

export function onDocumentMouseDown(event) {
  dragging = true;
  window.dragging = true;
  pressX = mouseX;
  pressY = mouseY;
  rotateTargetX = undefined;
  rotateTargetY = undefined;

  window.rotateVX = 0;
  window.rotateVY = 0;
  window.initialAutoRotate = false;
}

export function onDocumentMouseUp(event) {
  dragging = false;
  window.dragging = false;
}

export function onClick(event) {
  if (Math.abs(pressX - mouseX) > 3 || Math.abs(pressY - mouseY) > 3) return;
}

export function onKeyDown(event) {}

function handleMWheel(delta) {
  var camera = window.camera;

  // 如果正在执行缩放动画，中断动画并接管控制
  if (camera.easeZooming) {
    camera.easeZooming.stop();
    camera.easeZooming = undefined;
    // 同步 target 到当前位置
    camera.position.target.z = camera.position.z;
    camera.position.target.pz = camera.position.z;
  }

  camera.position.target.z += delta * camera.position.target.z * 0.01;
  camera.position.target.z = constrain(
    camera.position.target.z,
    CAMERA.ZOOM.MIN,
    CAMERA.ZOOM.MAX,
  );
  camera.position.target.pz = camera.position.target.z;

  camera.rotation.vx +=
    ((-0.0001 + Math.random() * 0.0002) * camera.position.z) / 1000;
  camera.rotation.vy +=
    ((-0.0001 + Math.random() * 0.0002) * camera.position.z) / 1000;

  if (window.updateMinimap) {
    window.updateMinimap();
  }

  if (window.initialAutoRotate) {
    window.initialAutoRotate = false;
  }
}

export function onMouseWheel(event) {
  var delta = 0;

  if (event.wheelDelta) {
    delta = event.wheelDelta / 120;
  } else if (event.deltaY !== undefined) {
    // wheel event (standard)
    // deltaY direction is opposite to wheelDelta
    // deltaMode: 0=pixel, 1=line, 2=page
    var factor = event.deltaMode === 1 ? 3 : 100;
    delta = -event.deltaY / factor;
  } else if (event.detail) {
    delta = -event.detail / 3;
  }

  if (delta) handleMWheel(delta);

  event.returnValue = false;
  if (event.preventDefault) event.preventDefault();
}

export function onDocumentResize(e) {}

function determineTouchMode(event) {
  if (event.touches.length <= 0 || event.touches.length > 2) {
    touchMode = TOUCHMODES.NONE;
    return;
  }

  if (event.touches.length == 1) {
    touchMode = TOUCHMODES.SINGLE;
    return;
  }

  if (event.touches.length == 2) {
    touchMode = TOUCHMODES.DOUBLE;
    return;
  }
}

function equalizeTouchTracking(event) {
  if (event.touches.length == 2) {
    var touchA = event.touches[0];
    var touchB = event.touches[1];
    touchDelta = calculateTouchDistance(touchA, touchB);
    previousTouchDelta = touchDelta;
  }

  if (event.touches.length < 1) return;

  var touch = event.touches[0];
  pmouseX = mouseX = touch.pageX - window.innerWidth * 0.5;
  pmouseX = mouseY = touch.pageY - window.innerHeight * 0.5;
}

export function touchStart(event) {
  onDocumentMouseDown(event);

  determineTouchMode(event);
  equalizeTouchTracking(event);
  event.preventDefault();
}

export function touchEnd(event) {
  scrollbaring = false;

  onDocumentMouseUp(event);
  determineTouchMode(event);
  equalizeTouchTracking(event);
}

export function touchMove(event) {
  if (scrollbaring) {
    var touch = event.touches[0];
    if (window.setScrollPositionFromTouch)
      window.setScrollPositionFromTouch(touch);
    event.preventDefault();
    return;
  }

  determineTouchMode(event);

  if (touchMode == TOUCHMODES.SINGLE) {
    pmouseX = mouseX;
    pmouseY = mouseY;

    var touch = event.touches[0];

    mouseX = touch.pageX - window.innerWidth * 0.5;
    mouseY = touch.pageY - window.innerHeight * 0.5;

    if (dragging) {
      doCameraRotationFromInteraction();
      if (window.setMinimap) window.setMinimap(dragging);
    }
  } else if (touchMode == TOUCHMODES.DOUBLE) {
    var touchA = event.touches[0];
    var touchB = event.touches[1];

    previousTouchDelta = touchDelta;
    touchDelta = calculateTouchDistance(touchA, touchB);

    var pinchAmount = touchDelta - previousTouchDelta;
    handleMWheel(-pinchAmount * 0.25);
  }
}

function calculateTouchDistance(touchA, touchB) {
  var taX = touchA.pageX;
  var taY = touchA.pageY;
  var tbX = touchB.pageX;
  var tbY = touchB.pageY;
  var dist = Math.sqrt(Math.pow(tbX - taX, 2) + Math.pow(tbY - taY, 2));
  return dist;
}

var DRAG_SENSITIVITY = 0.08;

function doCameraRotationFromInteraction() {
  var camera = window.camera;
  window.rotateVY +=
    ((((mouseX - pmouseX) / 2) * Math.PI) / 180) * DRAG_SENSITIVITY;
  window.rotateVX +=
    ((((mouseY - pmouseY) / 2) * Math.PI) / 180) * DRAG_SENSITIVITY;

  var camFactor = (0.000015 * camera.position.z) / 10000;
  camera.rotation.vy += (mouseX - pmouseX) * camFactor;
  camera.rotation.vx += (mouseY - pmouseY) * camFactor;
}

window.rotateVX = 0;
window.rotateVY = 0;
window.rotateX = 0;
window.rotateY = 0;
window.dragging = false;

window.onDocumentMouseMove = onDocumentMouseMove;
window.onDocumentMouseDown = onDocumentMouseDown;
window.onDocumentMouseUp = onDocumentMouseUp;
window.onClick = onClick;
window.onKeyDown = onKeyDown;
window.onMouseWheel = onMouseWheel;
window.onDocumentResize = onDocumentResize;
window.touchStart = touchStart;
window.touchEnd = touchEnd;
window.touchMove = touchMove;
