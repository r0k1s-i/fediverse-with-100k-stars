/**
 * Central State Module
 *
 * Usage:
 * import { state } from "./state.js";
 *
 * Note: window.state and window.globals are exposed for legacy compatibility
 * and debugging only. Do not rely on them for new code.
 */
export const state = {
  scene: null,
  camera: null,
  renderer: null,

  rotating: null,
  translating: null,
  galacticCentering: null,

  starModel: null,
  pSystem: null,
  pGalacticSystem: null,
  pDustSystem: null,
  earth: null,

  screenWidth: 0,
  screenHeight: 0,
  screenWhalf: 0,
  screenHhalf: 0,

  rotateX: 0,
  rotateY: 0,
  rotateVX: 0,
  rotateVY: 0,

  shaderList: null,

  enableDataStar: true,
  enableSkybox: true,
  enableGalaxy: true,
  enableDust: false,
  enableSolarSystem: true,
  enableStarModel: true,
  enableDirector: true,

  // Data
  fediverseInstances: null,
  markerThreshold: null,
  wheelGuard: null,
};

// Harden legacy aliases to prevent accidental reassignment
if (typeof window !== "undefined") {
  Object.defineProperty(window, "state", {
    get: () => state,
    configurable: false,
    enumerable: true,
  });

  Object.defineProperty(window, "globals", {
    get: () => state,
    configurable: false,
    enumerable: true,
  });
}
