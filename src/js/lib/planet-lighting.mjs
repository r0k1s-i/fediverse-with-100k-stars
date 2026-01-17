import { MODEL_TOKENS } from "./model-config.mjs";

const TARGET_MODEL_TOKEN = MODEL_TOKENS.UNIVERSE;

export const PLANET_INTERNAL_LIGHT_DEFAULTS = Object.freeze({
  color: 0xffffff,
  intensity: 60,
  distance: 0,
  decay: 0,
  position: Object.freeze({ x: 0, y: 0, z: 0 }),
});

export function getPlanetInternalLightConfig(overrides = {}) {
  const resolved = {
    ...PLANET_INTERNAL_LIGHT_DEFAULTS,
    ...(overrides || {}),
  };

  if (overrides && overrides.position) {
    resolved.position = {
      ...PLANET_INTERNAL_LIGHT_DEFAULTS.position,
      ...(overrides.position || {}),
    };
  }

  return resolved;
}

export function shouldAttachPlanetInternalLight(modelName) {
  if (!modelName) return false;
  return modelName.indexOf(TARGET_MODEL_TOKEN) !== -1;
}

export function createPlanetInternalLight(three, config) {
  if (!three || !three.PointLight || !config) return null;
  const light = new three.PointLight(
    config.color,
    config.intensity,
    config.distance,
    config.decay,
  );
  if (light.position && config.position) {
    light.position.set(config.position.x, config.position.y, config.position.z);
  }
  if (config.name) {
    light.name = config.name;
  }
  return light;
}
