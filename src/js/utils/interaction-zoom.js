export function shouldZoomOnClick(params) {
  var data = params || {};
  var isZoomedInClose = Boolean(data.isZoomedInClose);
  var isNewInstance = Boolean(data.isNewInstance);
  var currentZ =
    typeof data.currentZ === "number" ? data.currentZ : undefined;
  var targetZ = typeof data.targetZ === "number" ? data.targetZ : undefined;
  var zoomLevel = typeof data.zoomLevel === "number" ? data.zoomLevel : 0;
  var tolerance = typeof data.tolerance === "number" ? data.tolerance : 0.25;

  if (isZoomedInClose) {
    return false;
  }

  var referenceZ =
    typeof targetZ === "number"
      ? targetZ
      : typeof currentZ === "number"
        ? currentZ
        : 0;
  var distance = Math.abs(referenceZ - zoomLevel);

  if (distance <= tolerance) {
    return false;
  }

  if (isNewInstance) {
    return true;
  }

  if (typeof currentZ === "number" && currentZ > zoomLevel + tolerance) {
    return true;
  }

  return false;
}
