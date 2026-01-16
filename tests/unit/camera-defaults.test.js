const { expect } = window;
import { CAMERA } from "../../src/js/core/constants.js";

describe("Camera defaults", function () {
  it("uses 2000 as the initial Z distance", function () {
    expect(CAMERA.POSITION.INITIAL_Z).to.equal(2000);
  });
});
