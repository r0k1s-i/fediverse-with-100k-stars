export function getZoomByStarRadius(radius) {
  return radius * 2.0;
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
window.getOffsetByStarRadius = getOffsetByStarRadius;
window.AUToLY = AUToLY;
window.KMToLY = KMToLY;
