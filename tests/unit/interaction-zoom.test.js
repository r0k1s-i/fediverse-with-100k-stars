import { shouldZoomOnClick } from "../../src/js/utils/interaction-zoom.js";

describe("interaction-zoom", function () {
  it("does not zoom when already in close view", function () {
    var result = shouldZoomOnClick({
      isZoomedInClose: true,
      isNewInstance: true,
      currentZ: 150,
      targetZ: 150,
      zoomLevel: 6,
    });

    expect(result).to.equal(false);
  });

  it("zooms when not close and instance is new", function () {
    var result = shouldZoomOnClick({
      isZoomedInClose: false,
      isNewInstance: true,
      currentZ: 2000,
      targetZ: 2000,
      zoomLevel: 4,
    });

    expect(result).to.equal(true);
  });

  it("zooms when not close and instance is same but camera is far", function () {
    var result = shouldZoomOnClick({
      isZoomedInClose: false,
      isNewInstance: false,
      currentZ: 218,
      targetZ: 218,
      zoomLevel: 6,
    });

    expect(result).to.equal(true);
  });

  it("does not zoom when already near the target zoom", function () {
    var result = shouldZoomOnClick({
      isZoomedInClose: false,
      isNewInstance: false,
      currentZ: 6.05,
      targetZ: 6,
      zoomLevel: 6,
      tolerance: 0.1,
    });

    expect(result).to.equal(false);
  });
});
