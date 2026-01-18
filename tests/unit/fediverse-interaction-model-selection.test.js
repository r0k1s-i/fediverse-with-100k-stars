/**
 * Fediverse Interaction Model Selection Tests
 *
 * Verifies that close-zoom model selection does not randomize twice.
 */
const { expect } = window;
import * as THREE from "three";
import {
  updateFediverseInteraction,
  __setFediverseInteractionForTest,
} from "../../src/js/core/fediverse-interaction.js";
import { state } from "../../src/js/core/state.js";

function makeStarModel(counter) {
  return {
    visible: false,
    userData: {},
    position: new THREE.Vector3(),
    setSpectralIndex: function () {},
    setScale: function () {},
    randomizeSolarFlare: function () {},
    randomizeRotationSpeed: function () {},
    pickRandomModel: function () {
      counter.count += 1;
    },
  };
}

describe("Fediverse Interaction model selection", () => {
  beforeEach(() => {
    state.camera = { position: { z: 100 } };
    state.markerThreshold = { min: 200 };
    state.enableStarModel = true;
  });

  afterEach(() => {
    __setFediverseInteractionForTest({ intersected: null });
    state.starModel = null;
    state.camera = null;
    state.markerThreshold = null;
    state.enableStarModel = null;
    delete window.setStarModel;
  });

  it("should not randomize twice when setStarModel already picks", () => {
    const counter = { count: 0 };
    const starModel = makeStarModel(counter);
    state.starModel = starModel;

    const instancePosition = new THREE.Vector3(1, 2, 3);
    __setFediverseInteractionForTest({
      intersected: {
        instanceData: {
          position: instancePosition,
          domain: "example.social",
          stats: { user_count: 10 },
          color: { hsl: { h: 120 } },
        },
      },
    });

    window.setStarModel = function () {
      starModel.pickRandomModel();
    };

    updateFediverseInteraction();

    expect(counter.count).to.equal(1);
  });

  it("should randomize once when setStarModel is not defined", () => {
    const counter = { count: 0 };
    const starModel = makeStarModel(counter);
    state.starModel = starModel;

    const instancePosition = new THREE.Vector3(4, 5, 6);
    __setFediverseInteractionForTest({
      intersected: {
        instanceData: {
          position: instancePosition,
          domain: "example2.social",
          stats: { user_count: 5 },
          color: { hsl: { h: 200 } },
        },
      },
    });

    updateFediverseInteraction();

    expect(counter.count).to.equal(1);
  });
});
