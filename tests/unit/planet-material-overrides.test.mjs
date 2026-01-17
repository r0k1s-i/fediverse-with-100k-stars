import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const libPath = path.join(repoRoot, "src/js/lib/planet-material-overrides.mjs");
const libUrl = pathToFileURL(libPath).href;
const { getPlanetMaterialOverrides, applyPlanetMaterialOverrides } =
  await import(libUrl);

const universeShellMat = {
  isMeshStandardMaterial: true,
  name: "Mat_Nucleo",
  transparent: false,
  opacity: 1,
  depthWrite: true,
  side: "FrontSide",
  needsUpdate: false,
  emissive: {
    isColor: true,
    value: null,
    set(value) {
      this.value = value;
    },
  },
};

assert.equal(
  getPlanetMaterialOverrides("unknown.glb", universeShellMat),
  null,
  "non-target models should not be overridden",
);

/*
// Disabled - overrides are now handled in planet-model.js
const overrides = getPlanetMaterialOverrides("universe.glb", universeShellMat);
assert.ok(overrides, "expected overrides for universe.glb shell materials");
assert.equal(overrides.transparent, true);
assert.ok(overrides.opacity < 1, "shell opacity should be translucent");
assert.ok(overrides.opacity >= 0.5, "shell opacity should be visible");
assert.equal(overrides.depthWrite, false);
assert.equal(overrides.side, "DoubleSide");
assert.equal(overrides.transmission, 0.4);
assert.equal(overrides.thickness, 0.2);
assert.equal(overrides.emissive, 0xffffff);
assert.equal(overrides.emissiveIntensity, 0.5);

const nonShellMat = { isMeshStandardMaterial: true, name: "Mat_Shell" };
assert.equal(
  getPlanetMaterialOverrides("universe.glb", nonShellMat),
  null,
  "non-shell materials should not be overridden",
);

const mockThree = {
  DoubleSide: 2,
  Color: class {
    constructor(value) {
      this.isColor = true;
      this.value = value;
    }
    set(value) {
      this.value = value;
    }
  },
};
const applied = applyPlanetMaterialOverrides(
  universeShellMat,
  overrides,
  mockThree,
);
assert.equal(applied, universeShellMat);
assert.equal(applied.transparent, true);
assert.ok(applied.opacity < 1);
assert.ok(applied.opacity >= 0.5);
assert.equal(applied.depthWrite, false);
assert.equal(applied.side, 2);
assert.equal(applied.emissive.value, 0xffffff);
assert.equal(applied.emissiveIntensity, 0.5);
assert.equal(applied.transmission, 0.4);
assert.equal(applied.thickness, 0.2);
assert.equal(applied.needsUpdate, true);
*/

console.log("planet-material-overrides tests passed");
