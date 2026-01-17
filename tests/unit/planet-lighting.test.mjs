import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const libPath = path.join(repoRoot, "src/js/lib/planet-lighting.mjs");
const libUrl = pathToFileURL(libPath).href;
const {
  PLANET_INTERNAL_LIGHT_DEFAULTS,
  getPlanetInternalLightConfig,
  shouldAttachPlanetInternalLight,
  createPlanetInternalLight,
} = await import(libUrl);

const defaults = getPlanetInternalLightConfig();
assert.deepEqual(
  defaults,
  PLANET_INTERNAL_LIGHT_DEFAULTS,
  "defaults should match constant",
);
assert.equal(defaults.intensity, 60);
assert.equal(defaults.distance, 0);
assert.equal(defaults.decay, 0);

const overrideConfig = getPlanetInternalLightConfig({
  intensity: 42,
  position: { x: 1, y: 2, z: 3 },
});
assert.equal(overrideConfig.intensity, 42);
assert.equal(overrideConfig.position.x, 1);
assert.equal(overrideConfig.position.y, 2);
assert.equal(overrideConfig.position.z, 3);
assert.equal(overrideConfig.color, PLANET_INTERNAL_LIGHT_DEFAULTS.color);

assert.equal(
  shouldAttachPlanetInternalLight("src/assets/textures/the_universe.glb"),
  true,
);
assert.equal(
  shouldAttachPlanetInternalLight(
    "src/assets/textures/planet_325_the_king.glb",
  ),
  false,
);

const mockThree = {
  PointLight: class {
    constructor(color, intensity, distance, decay) {
      this.color = color;
      this.intensity = intensity;
      this.distance = distance;
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
    }
  },
};

const light = createPlanetInternalLight(mockThree, defaults);
assert.equal(light.color, defaults.color);
assert.equal(light.intensity, defaults.intensity);
assert.equal(light.distance, defaults.distance);
assert.equal(light.decay, defaults.decay);
assert.equal(light.position.x, defaults.position.x);
assert.equal(light.position.y, defaults.position.y);
assert.equal(light.position.z, defaults.position.z);

console.log("planet-lighting tests passed");
