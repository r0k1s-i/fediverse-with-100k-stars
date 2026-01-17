/**
 * Centralized Model Configuration
 *
 * Single source of truth for model-specific processing rules.
 * Avoids scattered hardcoded tokens across multiple files.
 */

/**
 * Model tokens - use these instead of hardcoding strings
 */
export const MODEL_TOKENS = Object.freeze({
  UNIVERSE: "universe.glb",
  LAMPLIGHTER: "planet_329_lamplighter",
});

/**
 * Universe.glb shell material names that should receive glass effect
 */
export const UNIVERSE_SHELL_MATERIALS = Object.freeze(
  new Set(["Mat_Nucleo", "Mat_Orb", "Mat_Orb2"])
);

/**
 * Check if a model name matches a specific token
 * @param {string} modelName - Full model path or name
 * @param {string} token - Token to match against
 * @returns {boolean}
 */
export function isModelType(modelName, token) {
  if (!modelName || typeof modelName !== "string") return false;
  return modelName.includes(token);
}

/**
 * Check if this is the universe.glb model
 * @param {string} modelName
 * @returns {boolean}
 */
export function isUniverseModel(modelName) {
  return isModelType(modelName, MODEL_TOKENS.UNIVERSE);
}

/**
 * Check if this is the lamplighter model
 * @param {string} modelName
 * @returns {boolean}
 */
export function isLamplighterModel(modelName) {
  return isModelType(modelName, MODEL_TOKENS.LAMPLIGHTER);
}

/**
 * Check if a material is a universe shell material (for glass effect)
 * @param {Object} material - Three.js material
 * @returns {boolean}
 */
export function isUniverseShellMaterial(material) {
  if (!material || !material.name) return false;
  const name = material.name;
  for (const shellName of UNIVERSE_SHELL_MATERIALS) {
    if (name === shellName || name.startsWith(shellName + ".")) {
      return true;
    }
  }
  return false;
}

/**
 * Check if ANY material in a mesh is a universe shell material
 * Handles both single materials and material arrays
 * @param {Object|Array} material - Three.js material or array of materials
 * @returns {boolean}
 */
export function hasUniverseShellMaterial(material) {
  if (!material) return false;
  const mats = Array.isArray(material) ? material : [material];
  return mats.some((m) => isUniverseShellMaterial(m));
}

/**
 * Check if a mesh name is a duplicate .001 mesh that should be hidden
 * GLTFLoader removes dots, so "pPipe2.001" becomes "pPipe2001"
 * @param {string} meshName
 * @returns {boolean}
 */
export function isDuplicateMeshName(meshName) {
  if (!meshName) return false;
  return meshName.endsWith("001") && !meshName.includes("_");
}

/**
 * Check if a material name indicates a duplicate .001 material
 * @param {string} materialName
 * @returns {boolean}
 */
export function isDuplicateMaterialName(materialName) {
  if (!materialName) return false;
  return materialName.includes(".001");
}
