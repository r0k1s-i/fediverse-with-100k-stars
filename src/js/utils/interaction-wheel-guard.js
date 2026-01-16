var DEFAULT_GUARD_MS = 300;

export function createWheelGuard(guardMs) {
  var duration =
    typeof guardMs === "number" && guardMs >= 0
      ? guardMs
      : DEFAULT_GUARD_MS;

  return {
    durationMs: duration,
    activeUntil: 0,
  };
}

export function activateWheelGuard(guard, now) {
  if (!guard) {
    return;
  }
  var time = typeof now === "number" ? now : Date.now();
  guard.activeUntil = time + guard.durationMs;
}

export function shouldIgnoreWheel(guard, now) {
  if (!guard) {
    return false;
  }
  var time = typeof now === "number" ? now : Date.now();
  return guard.activeUntil > time;
}

export { DEFAULT_GUARD_MS };
