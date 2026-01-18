const { expect } = window;
import { CAMERA } from "../../src/js/core/constants.js";

describe("Return zoom", function () {
  it("maps return zoom to minimap cursor around 29.6", function () {
    var targetZ = CAMERA.POSITION.RETURN_Z;
    var minZ = 1.1;
    var maxZ = 40000;
    var power = 3;

    var normal = (targetZ - minZ) / (maxZ - minZ);
    normal = Math.min(1, Math.max(0, normal));
    var position = Math.pow(normal, 1 / power) * 100;

    expect(position).to.be.closeTo(29.6, 0.5);
  });

  it("uses return zoom constant in zoom-back handling", async function () {
    const response = await fetch("/src/js/core/main.js");
    const source = await response.text();

    expect(source).to.include("zoomOut(CAMERA.POSITION.RETURN_Z");
  });

  it("uses return zoom constant in minimap home handling", async function () {
    const response = await fetch("/src/js/core/minimap.js");
    const source = await response.text();

    expect(source).to.include("zoomOut(CAMERA.POSITION.RETURN_Z");
  });

  it("uses return zoom constant when returning to fediverse center", async function () {
    const response = await fetch("/src/js/core/fediverse-interaction.js");
    const source = await response.text();

    expect(source).to.include(
      "camera.position.target.z = CAMERA.POSITION.RETURN_Z",
    );
  });
});
