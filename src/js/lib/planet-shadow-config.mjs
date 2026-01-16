export const DEFAULT_SHADOW_CONFIG = Object.freeze({
  bias: -0.0002,
  normalBias: 0.02,
  radius: 2,
  mapSize: Object.freeze({ width: 1024, height: 1024 }),
});

export function getPlanetShadowConfig(overrides = {}) {
  const mapSize = overrides.mapSize
    ? {
        width:
          typeof overrides.mapSize.width === "number"
            ? overrides.mapSize.width
            : DEFAULT_SHADOW_CONFIG.mapSize.width,
        height:
          typeof overrides.mapSize.height === "number"
            ? overrides.mapSize.height
            : DEFAULT_SHADOW_CONFIG.mapSize.height,
      }
    : DEFAULT_SHADOW_CONFIG.mapSize;

  return {
    bias:
      typeof overrides.bias === "number"
        ? overrides.bias
        : DEFAULT_SHADOW_CONFIG.bias,
    normalBias:
      typeof overrides.normalBias === "number"
        ? overrides.normalBias
        : DEFAULT_SHADOW_CONFIG.normalBias,
    radius:
      typeof overrides.radius === "number"
        ? overrides.radius
        : DEFAULT_SHADOW_CONFIG.radius,
    mapSize,
  };
}

export function applyPlanetShadowConfig(light, config) {
  if (!light || !light.shadow || !config) return;

  if (typeof config.bias === "number") {
    light.shadow.bias = config.bias;
  }
  if (typeof config.normalBias === "number") {
    light.shadow.normalBias = config.normalBias;
  }
  if (typeof config.radius === "number") {
    light.shadow.radius = config.radius;
  }
  if (config.mapSize) {
    if (light.shadow.mapSize) {
      if (typeof config.mapSize.width === "number") {
        light.shadow.mapSize.width = config.mapSize.width;
      }
      if (typeof config.mapSize.height === "number") {
        light.shadow.mapSize.height = config.mapSize.height;
      }
    }
  }
}
