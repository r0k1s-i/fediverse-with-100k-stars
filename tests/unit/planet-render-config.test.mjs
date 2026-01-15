import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const libPath = path.join(repoRoot, "src/js/lib/planet-render-config.mjs");
const libUrl = pathToFileURL(libPath).href;
const {
  PLANET_RENDER_DEFAULTS,
  getPlanetRenderConfig,
  applyPlanetRenderConfig,
  restorePlanetRenderConfig,
  createPlanetSpotlight,
  attachPlanetModelName,
  updatePlanetSpotlightTransform,
  shouldUsePlanetSpotlight,
} = await import(libUrl);

const defaults = getPlanetRenderConfig();
assert.deepEqual(
  defaults,
  PLANET_RENDER_DEFAULTS,
  "defaults should match constant",
);

const spotlightOverride = getPlanetRenderConfig({
  spotlight: { intensity: 22 },
});
assert.equal(spotlightOverride.spotlight.intensity, 22);
assert.equal(
  spotlightOverride.spotlight.angle,
  PLANET_RENDER_DEFAULTS.spotlight.angle,
);
assert.equal(
  spotlightOverride.spotlight.penumbra,
  PLANET_RENDER_DEFAULTS.spotlight.penumbra,
);
assert.equal(
  spotlightOverride.spotlight.modelMatch,
  PLANET_RENDER_DEFAULTS.spotlight.modelMatch,
);

const modelTarget = {};
const modelSource = { userData: { modelName: "planet_325_the_king.glb" } };
attachPlanetModelName(modelTarget, modelSource);
assert.equal(modelTarget.userData.modelName, "planet_325_the_king.glb");

const mockRenderer = {
  toneMapping: "legacy",
  toneMappingExposure: 1.0,
  outputColorSpace: "legacy",
};

const mockThree = {
  ACESFilmicToneMapping: "aces",
  SRGBColorSpace: "srgb",
};

const prev = applyPlanetRenderConfig(mockRenderer, mockThree, defaults);
assert.equal(mockRenderer.toneMapping, "aces");
assert.equal(mockRenderer.outputColorSpace, "srgb");
assert.equal(mockRenderer.toneMappingExposure, defaults.exposure);
assert.deepEqual(prev, {
  toneMapping: "legacy",
  toneMappingExposure: 1.0,
  outputColorSpace: "legacy",
});

restorePlanetRenderConfig(mockRenderer, prev);
assert.deepEqual(mockRenderer, prev, "restore should reset renderer state");

const mockThreeLight = {
  SpotLight: class {
    constructor(color, intensity, distance, angle, penumbra, decay) {
      this.color = color;
      this.intensity = intensity;
      this.distance = distance;
      this.angle = angle;
      this.penumbra = penumbra;
      this.decay = decay;
      this.position = {
        x: 0,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      };
      this.target = {
        position: {
          x: 0,
          y: 0,
          z: 0,
          set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
          },
        },
      };
    }
  },
};

const spotlightConfig = getPlanetRenderConfig({
  spotlight: {
    color: 0xffe6cc,
    intensity: 35,
    distance: 14,
    angle: Math.PI / 22,
    penumbra: 0.15,
    decay: 2,
    position: { x: 0, y: 1, z: 0 },
    target: { x: 0, y: 0.9, z: 0 },
  },
});

const spotlight = createPlanetSpotlight(mockThreeLight, spotlightConfig);
assert.equal(spotlight.color, 0xffe6cc);
assert.equal(spotlight.intensity, 35);
assert.equal(spotlight.distance, 14);
assert.equal(spotlight.angle, Math.PI / 22);
assert.equal(spotlight.penumbra, 0.15);
assert.equal(spotlight.decay, 2);
assert.equal(spotlight.position.x, 0);
assert.equal(spotlight.position.y, 1);
assert.equal(spotlight.position.z, 0);
assert.equal(spotlight.target.position.x, 0);
assert.equal(spotlight.target.position.y, 0.9);
assert.equal(spotlight.target.position.z, 0);

const modelMatrixWorld = {
  elements: [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1],
};
const mockModel = { matrixWorld: modelMatrixWorld };
const mockSpot = {
  position: {
    x: 0,
    y: 0,
    z: 0,
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    },
  },
  target: {
    position: {
      x: 0,
      y: 0,
      z: 0,
      set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
    },
  },
};

updatePlanetSpotlightTransform(mockSpot, mockModel, spotlightConfig);
assert.equal(mockSpot.position.x, 0);
assert.equal(mockSpot.position.y, 2);
assert.equal(mockSpot.position.z, 3);
assert.ok(Math.abs(mockSpot.target.position.x - 0.1) < 1e-9);
assert.equal(mockSpot.target.position.y, 2);
assert.equal(mockSpot.target.position.z, 3);

const matchingModel = { userData: { modelName: "planet_325_the_king.glb" } };
const nonMatchingModel = {
  userData: { modelName: "planet_329_lamplighter.glb" },
};
assert.equal(shouldUsePlanetSpotlight(matchingModel, spotlightConfig), true);
assert.equal(
  shouldUsePlanetSpotlight(nonMatchingModel, spotlightConfig),
  false,
);

console.log("planet-render-config tests passed");
