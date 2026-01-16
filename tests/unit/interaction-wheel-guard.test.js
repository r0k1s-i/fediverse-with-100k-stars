import {
  createWheelGuard,
  shouldIgnoreWheel,
} from "../../src/js/utils/interaction-wheel-guard.js";

describe("interaction-wheel-guard", function () {
  it("ignores wheel events within the guard window", function () {
    var guard = createWheelGuard(500);
    var now = 1000;

    guard.activate(now);

    expect(shouldIgnoreWheel(guard, 1200)).to.equal(true);
    expect(shouldIgnoreWheel(guard, 1600)).to.equal(false);
  });

  it("does not ignore wheel events when guard is inactive", function () {
    var guard = createWheelGuard(300);

    expect(shouldIgnoreWheel(guard, 1000)).to.equal(false);
  });
});
