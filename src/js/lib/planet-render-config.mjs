export const PLANET_RENDER_DEFAULTS = Object.freeze({
  exposure: 0.35,
  toneMapping: "ACESFilmicToneMapping",
  outputColorSpace: "SRGBColorSpace",
  spotlight: Object.freeze({
    name: "planetSpotKeyTop",
    modelMatch: "planet_325_the_king",
    color: 0xffe6cc,
    intensity: 280,
    distance: 14,
    angle: Math.PI / 22,
    penumbra: 0.15,
    decay: 2,
    scaleWithModel: true,
    position: Object.freeze({ x: 0, y: 1.8, z: 0 }),
    target: Object.freeze({ x: 0, y: 0.9, z: 0 }),
  }),
});

export function getPlanetRenderConfig(overrides = {}) {
  const resolvedSpotlight = {
    ...PLANET_RENDER_DEFAULTS.spotlight,
    ...(overrides && overrides.spotlight ? overrides.spotlight : {}),
  };
  if (overrides && overrides.spotlight) {
    resolvedSpotlight.position = {
      ...PLANET_RENDER_DEFAULTS.spotlight.position,
      ...(overrides.spotlight.position || {}),
    };
    resolvedSpotlight.target = {
      ...PLANET_RENDER_DEFAULTS.spotlight.target,
      ...(overrides.spotlight.target || {}),
    };
  }

  return {
    ...PLANET_RENDER_DEFAULTS,
    ...(overrides || {}),
    spotlight: resolvedSpotlight,
  };
}

export function attachPlanetModelName(target, source) {
  if (!target) return;
  const sourceName = source && source.userData ? source.userData.modelName : "";
  if (!sourceName) return;
  target.userData = target.userData || {};
  target.userData.modelName = sourceName;
}

export function applyPlanetRenderConfig(renderer, three, config) {
  if (!renderer) return null;
  const prev = {
    toneMapping: renderer.toneMapping,
    toneMappingExposure: renderer.toneMappingExposure,
    outputColorSpace: renderer.outputColorSpace,
  };

  const resolved = getPlanetRenderConfig(config);

  if (three && resolved.toneMapping && three[resolved.toneMapping]) {
    renderer.toneMapping = three[resolved.toneMapping];
  }

  if (three && resolved.outputColorSpace && three[resolved.outputColorSpace]) {
    renderer.outputColorSpace = three[resolved.outputColorSpace];
  }

  if (typeof resolved.exposure === "number") {
    renderer.toneMappingExposure = resolved.exposure;
  }

  return prev;
}

export function restorePlanetRenderConfig(renderer, prev) {
  if (!renderer || !prev) return;
  renderer.toneMapping = prev.toneMapping;
  renderer.toneMappingExposure = prev.toneMappingExposure;
  renderer.outputColorSpace = prev.outputColorSpace;
}

export function createPlanetSpotlight(three, config) {
  if (!three || !three.SpotLight || !config || !config.spotlight) return null;

  const s = config.spotlight;
  const light = new three.SpotLight(
    s.color,
    s.intensity,
    s.distance,
    s.angle,
    s.penumbra,
    s.decay,
  );
  if (s.name) light.name = s.name;
  if (light.position && s.position) {
    light.position.set(s.position.x, s.position.y, s.position.z);
  }
  if (light.target && light.target.position && s.target) {
    light.target.position.set(s.target.x, s.target.y, s.target.z);
  }

  return light;
}

function applyMatrixWorldToPoint(matrixWorld, point) {
  const e = matrixWorld.elements;
  const x = point.x || 0;
  const y = point.y || 0;
  const z = point.z || 0;
  const w = e[3] * x + e[7] * y + e[11] * z + e[15];
  const iw = w ? 1 / w : 1;

  return {
    x: (e[0] * x + e[4] * y + e[8] * z + e[12]) * iw,
    y: (e[1] * x + e[5] * y + e[9] * z + e[13]) * iw,
    z: (e[2] * x + e[6] * y + e[10] * z + e[14]) * iw,
  };
}

function getUniformScaleFromMatrixWorld(matrixWorld) {
  const e = matrixWorld.elements;
  const scaleX = Math.sqrt(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]);
  const scaleY = Math.sqrt(e[4] * e[4] + e[5] * e[5] + e[6] * e[6]);
  const scaleZ = Math.sqrt(e[8] * e[8] + e[9] * e[9] + e[10] * e[10]);
  return (scaleX + scaleY + scaleZ) / 3 || 1;
}

function getModelScale(model) {
  const meshScale = model && model._planetMesh && model._planetMesh.scale;
  if (meshScale) {
    const scaleX = Math.abs(meshScale.x || 0);
    const scaleY = Math.abs(meshScale.y || 0);
    const scaleZ = Math.abs(meshScale.z || 0);
    const avgScale = (scaleX + scaleY + scaleZ) / 3;
    return avgScale || 1;
  }

  return getUniformScaleFromMatrixWorld(model.matrixWorld);
}

export function updatePlanetSpotlightTransform(spotlight, model, config) {
  if (
    !spotlight ||
    !model ||
    !model.matrixWorld ||
    !config ||
    !config.spotlight
  ) {
    return;
  }

  const s = config.spotlight;
  const baseLocalPos = s.position || { x: 0, y: 0, z: 0 };
  const baseLocalTarget = s.target || { x: 0, y: 0, z: 0 };
  const scale = s.scaleWithModel ? getModelScale(model) : 1;
  const localPos = {
    x: baseLocalPos.x * scale,
    y: baseLocalPos.y * scale,
    z: baseLocalPos.z * scale,
  };
  const localTarget = {
    x: baseLocalTarget.x * scale,
    y: baseLocalTarget.y * scale,
    z: baseLocalTarget.z * scale,
  };
  const worldPos = applyMatrixWorldToPoint(model.matrixWorld, localPos);
  const worldTarget = applyMatrixWorldToPoint(model.matrixWorld, localTarget);

  if (spotlight.position && spotlight.position.set) {
    spotlight.position.set(worldPos.x, worldPos.y, worldPos.z);
  }
  if (
    spotlight.target &&
    spotlight.target.position &&
    spotlight.target.position.set
  ) {
    spotlight.target.position.set(worldTarget.x, worldTarget.y, worldTarget.z);
  }

  if (typeof s.distance === "number" && s.scaleWithModel) {
    spotlight.distance = s.distance * scale;
  }
}

export function shouldUsePlanetSpotlight(model, config) {
  if (!model || !config || !config.spotlight) return false;
  const modelName = model.userData ? model.userData.modelName : "";
  if (!modelName) return false;
  const match = config.spotlight.modelMatch;
  if (!match) return true;
  return modelName.indexOf(match) !== -1;
}
