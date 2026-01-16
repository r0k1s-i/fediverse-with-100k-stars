export function getZoomByStarRadius(radius) {
  return radius * 2.0;
}

export function ensureCameraTarget(camera, fallbackZ = 0) {
  if (!camera || !camera.position) return;

  var hasTarget =
    camera.position.target && typeof camera.position.target === "object";
  if (!hasTarget) {
    var initialZ =
      typeof camera.position.z === "number" ? camera.position.z : fallbackZ;
    camera.position.target = { z: initialZ, pz: initialZ };
    return;
  }

  if (typeof camera.position.target.z !== "number") {
    camera.position.target.z =
      typeof camera.position.z === "number" ? camera.position.z : fallbackZ;
  }
  if (typeof camera.position.target.pz !== "number") {
    camera.position.target.pz = camera.position.target.z;
  }
}

export function getOffsetByStarRadius(radius) {
  // Fediverse模式下不需要offset，因为星球模型在原点(0,0,0)
  // translating容器会移动整个世界到正确的位置
  return new THREE.Vector3(0, 0, 0);
}

export function AUToLY(au) {
  return au * 1.58128588e-5;
}

export function KMToLY(km) {
  return km * 1.05702341e-13;
}

window.getZoomByStarRadius = getZoomByStarRadius;
window.ensureCameraTarget = ensureCameraTarget;
window.getOffsetByStarRadius = getOffsetByStarRadius;
window.AUToLY = AUToLY;
window.KMToLY = KMToLY;
