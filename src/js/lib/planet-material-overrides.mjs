import {
  MODEL_TOKENS,
  UNIVERSE_SHELL_MATERIALS,
  isUniverseModel,
  isUniverseShellMaterial,
} from "./model-config.mjs";

const BASE_OVERRIDES = Object.freeze({
  transparent: false,
  opacity: 1,
  depthWrite: true,
  depthTest: true,
  side: "DoubleSide",
  vertexColors: false,
  toneMapped: true,
  envMapIntensity: 1.5,
  materialKind: "standard",
});

const SHELL_OVERRIDES = Object.freeze({
  transparent: true,
  opacity: 0.25,
  depthWrite: false,
  depthTest: true,
  side: "DoubleSide",
  roughness: 1,
  metalness: 0.697,
  envMapIntensity: 1.96,
  emissiveIntensity: 0,
  renderOrder: 10,
  materialKind: "standard",
});

export function getPlanetMaterialOverrides(modelName, material) {
  // Disabled - shell materials are now handled directly in planet-model.js processLoadedScene
  return null;
}

function resolveSideValue(material, overrides, three) {
  if (overrides.side !== "DoubleSide") return overrides.side;
  if (three && typeof three.DoubleSide !== "undefined") {
    return three.DoubleSide;
  }
  return material.side;
}

function getPreservedMaterialProps(material) {
  return {
    map: material.map,
    normalMap: material.normalMap,
    roughnessMap: material.roughnessMap,
    metalnessMap: material.metalnessMap,
    emissive: material.emissive,
    emissiveMap: material.emissiveMap,
    color: material.color,
    vertexColors: material.vertexColors,
    name: material.name,
  };
}

function getPreservedBasicMaterialProps(material) {
  return {
    color: material.color,
    vertexColors: material.vertexColors,
    name: material.name,
    map: material.map,
    alphaMap: material.alphaMap,
    aoMap: material.aoMap,
    envMap: material.envMap,
  };
}

function shouldUpgradeToPhysical(material, overrides, three) {
  if (!three || !three.MeshPhysicalMaterial) return false;
  if (!overrides || overrides.materialKind !== "physical") return false;
  if (material.isMeshPhysicalMaterial) return false;
  return true;
}

export function applyPlanetMaterialOverrides(material, overrides, three) {
  if (!material || !overrides) return null;

  if (Array.isArray(material)) {
    return material.map((entry) =>
      applyPlanetMaterialOverrides(entry, overrides, three),
    );
  }

  let target = material;

  if (shouldUpgradeToPhysical(material, overrides, three)) {
    const preserved = getPreservedMaterialProps(material);
    target = new three.MeshPhysicalMaterial(preserved);
  }

  const resolved = { ...overrides };
  resolved.side = resolveSideValue(target, resolved, three);

  Object.keys(resolved).forEach((key) => {
    if (key === "color" && typeof resolved[key] === "number") {
      if (target.color && target.color.isColor) {
        target.color.set(resolved[key]);
      } else {
        target.color = new three.Color(resolved[key]);
      }
    } else if (key === "emissive" && typeof resolved[key] === "number") {
      if (target.emissive && target.emissive.isColor) {
        target.emissive.set(resolved[key]);
      } else if (three && typeof three.Color !== "undefined") {
        target.emissive = new three.Color(resolved[key]);
      } else {
        target.emissive = resolved[key];
      }
    } else {
      target[key] = resolved[key];
    }
  });

  target.needsUpdate = true;
  return target;
}
