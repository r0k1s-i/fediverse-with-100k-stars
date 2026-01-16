const { expect } = window;
import { fediverseDataPath } from "../../src/js/core/config.js";

describe("Config: Fediverse data path", function () {
  it("should default to CDN data path", function () {
    expect(fediverseDataPath).to.equal(
      "https://cdn.jsdelivr.net/gh/r0k1s-i/fediverse-with-100k-stars@data/fediverse_final.json",
    );
  });
});
