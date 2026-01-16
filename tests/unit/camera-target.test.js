const { expect } = window;
import { ensureCameraTarget } from "../../src/js/utils/app.js";

describe("ensureCameraTarget", function () {
  it("creates a target when missing", function () {
    var camera = { position: { z: 42 } };

    ensureCameraTarget(camera, 1000);

    expect(camera.position.target).to.be.an("object");
    expect(camera.position.target.z).to.equal(42);
    expect(camera.position.target.pz).to.equal(42);
  });
});
