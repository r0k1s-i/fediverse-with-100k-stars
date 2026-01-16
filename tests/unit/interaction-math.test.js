/**
 * Interaction Math Tests
 *
 * Tests for P0-3: 交互判定路径合并
 * Ensures unified interaction detection through InteractionMath.
 *
 * @see docs/plans/codebase-optimization-review.md
 */
// Use global expect from chai (loaded by runner.html)
const { expect } = window;
import { InteractionMath } from "../../src/js/core/interaction-math.js";
import { INTERACTION, VISIBILITY } from "../../src/js/core/constants.js";

describe("InteractionMath", () => {
  // ========================================================================
  // getDynamicThreshold Tests
  // ========================================================================

  describe("getDynamicThreshold", () => {
    it("should be defined", () => {
      expect(InteractionMath.getDynamicThreshold).to.exist;
      expect(InteractionMath.getDynamicThreshold).to.be.a("function");
    });

    it("should return BASE threshold for null camera", () => {
      const result = InteractionMath.getDynamicThreshold(null);
      expect(result).to.equal(INTERACTION.THRESHOLD.BASE);
    });

    it("should return BASE threshold for undefined camera", () => {
      const result = InteractionMath.getDynamicThreshold(undefined);
      expect(result).to.equal(INTERACTION.THRESHOLD.BASE);
    });

    it("should calculate dynamic threshold based on camera z", () => {
      const cameraZ = 1000;
      const expected = cameraZ * INTERACTION.THRESHOLD.DYNAMIC_FACTOR;
      const result = InteractionMath.getDynamicThreshold(cameraZ);
      expect(result).to.equal(expected);
    });

    it("should respect MIN threshold", () => {
      const cameraZ = 10; // Very close, would give small threshold
      const result = InteractionMath.getDynamicThreshold(cameraZ);
      expect(result).to.be.at.least(INTERACTION.THRESHOLD.MIN);
    });

    it("should handle negative camera z (absolute value)", () => {
      const cameraZ = -1000;
      const expected = Math.abs(cameraZ) * INTERACTION.THRESHOLD.DYNAMIC_FACTOR;
      const result = InteractionMath.getDynamicThreshold(cameraZ);
      expect(result).to.equal(expected);
    });
  });

  // ========================================================================
  // isZoomedInClose Tests
  // ========================================================================

  describe("isZoomedInClose", () => {
    it("should be defined", () => {
      expect(InteractionMath.isZoomedInClose).to.exist;
      expect(InteractionMath.isZoomedInClose).to.be.a("function");
    });

    it("should return true when camera z < markerThreshold.min", () => {
      const result = InteractionMath.isZoomedInClose(100, { min: 200 });
      expect(result).to.be.true;
    });

    it("should return false when camera z >= markerThreshold.min", () => {
      const result = InteractionMath.isZoomedInClose(300, { min: 200 });
      expect(result).to.be.false;
    });

    it("should use VISIBILITY.MARKER.MIN_Z when markerThreshold is undefined", () => {
      const closeZ = VISIBILITY.MARKER.MIN_Z - 50;
      const result = InteractionMath.isZoomedInClose(closeZ, undefined);
      expect(result).to.be.true;
    });

    it("should use VISIBILITY.MARKER.MIN_Z when markerThreshold is null", () => {
      const farZ = VISIBILITY.MARKER.MIN_Z + 50;
      const result = InteractionMath.isZoomedInClose(farZ, null);
      expect(result).to.be.false;
    });
  });

  // ========================================================================
  // findClosestInstance Tests
  // ========================================================================

  describe("findClosestInstance", () => {
    it("should be defined", () => {
      expect(InteractionMath.findClosestInstance).to.exist;
      expect(InteractionMath.findClosestInstance).to.be.a("function");
    });

    it("should return null for empty instances array", () => {
      const rayOrigin = { x: 0, y: 0, z: 0 };
      const rayDirection = { x: 0, y: 0, z: 1 };
      const instances = [];
      const threshold = 100;

      const result = InteractionMath.findClosestInstance(
        rayOrigin,
        rayDirection,
        instances,
        threshold,
      );
      expect(result).to.be.null;
    });

    it("should find closest instance along ray direction", () => {
      const rayOrigin = { x: 0, y: 0, z: 0 };
      const rayDirection = { x: 0, y: 0, z: 1 };
      const instances = [
        { position: { x: 0, y: 0, z: 100 }, name: "close" },
        { position: { x: 0, y: 0, z: 500 }, name: "far" },
      ];
      const threshold = 50;

      const result = InteractionMath.findClosestInstance(
        rayOrigin,
        rayDirection,
        instances,
        threshold,
      );
      expect(result).to.exist;
      expect(result.name).to.equal("close");
    });

    it("should ignore instances behind the ray origin", () => {
      const rayOrigin = { x: 0, y: 0, z: 100 };
      const rayDirection = { x: 0, y: 0, z: 1 };
      const instances = [
        { position: { x: 0, y: 0, z: 50 }, name: "behind" },
        { position: { x: 0, y: 0, z: 200 }, name: "ahead" },
      ];
      const threshold = 50;

      const result = InteractionMath.findClosestInstance(
        rayOrigin,
        rayDirection,
        instances,
        threshold,
      );
      expect(result).to.exist;
      expect(result.name).to.equal("ahead");
    });

    it("should ignore instances outside threshold distance", () => {
      const rayOrigin = { x: 0, y: 0, z: 0 };
      const rayDirection = { x: 0, y: 0, z: 1 };
      const instances = [
        { position: { x: 200, y: 0, z: 100 }, name: "too_far_perpendicular" },
      ];
      const threshold = 50;

      const result = InteractionMath.findClosestInstance(
        rayOrigin,
        rayDirection,
        instances,
        threshold,
      );
      expect(result).to.be.null;
    });

    it("should factor in instance size via user_count", () => {
      const rayOrigin = { x: 0, y: 0, z: 0 };
      const rayDirection = { x: 0, y: 0, z: 1 };
      // Large instance further from ray should still be detected
      const instances = [
        {
          position: { x: 30, y: 0, z: 100 },
          name: "large_instance",
          stats: { user_count: 100000 },
        },
      ];
      const threshold = 50;

      const result = InteractionMath.findClosestInstance(
        rayOrigin,
        rayDirection,
        instances,
        threshold,
      );
      expect(result).to.exist;
      expect(result.name).to.equal("large_instance");
    });

    it("should skip instances without position", () => {
      const rayOrigin = { x: 0, y: 0, z: 0 };
      const rayDirection = { x: 0, y: 0, z: 1 };
      const instances = [
        { name: "no_position" },
        { position: { x: 0, y: 0, z: 100 }, name: "has_position" },
      ];
      const threshold = 50;

      const result = InteractionMath.findClosestInstance(
        rayOrigin,
        rayDirection,
        instances,
        threshold,
      );
      expect(result).to.exist;
      expect(result.name).to.equal("has_position");
    });

    it("should use RAY_DETECTION constants from config", () => {
      // This test verifies that changes to INTERACTION.RAY_DETECTION
      // affect the behavior of findClosestInstance
      const rayOrigin = { x: 0, y: 0, z: 0 };
      const rayDirection = { x: 0, y: 0, z: 1 };

      // Instance at extreme angle (close to MIN_COS_ANGLE threshold)
      const cosAngle = INTERACTION.RAY_DETECTION.MIN_COS_ANGLE - 0.01;
      const angle = Math.acos(cosAngle);
      const distance = 100;

      // Position at that angle
      const x = distance * Math.sin(angle);
      const z = distance * Math.cos(angle);

      const instances = [{ position: { x: x, y: 0, z: z }, name: "at_angle" }];
      const threshold = 200;

      // Should be filtered out due to angle
      const result = InteractionMath.findClosestInstance(
        rayOrigin,
        rayDirection,
        instances,
        threshold,
      );
      expect(result).to.be.null;
    });

    it("should prefer nearer instances with lower score", () => {
      const rayOrigin = { x: 0, y: 0, z: 0 };
      const rayDirection = { x: 0, y: 0, z: 1 };

      // Two instances on the ray, nearer one should win
      const instances = [
        { position: { x: 1, y: 0, z: 500 }, name: "far_aligned" },
        { position: { x: 2, y: 0, z: 100 }, name: "near_aligned" },
      ];
      const threshold = 50;

      const result = InteractionMath.findClosestInstance(
        rayOrigin,
        rayDirection,
        instances,
        threshold,
      );
      expect(result).to.exist;
      expect(result.name).to.equal("near_aligned");
    });
  });

  // ========================================================================
  // Constants Integration Tests
  // ========================================================================

  describe("Constants Integration", () => {
    it("should use INTERACTION.THRESHOLD.BASE as fallback", () => {
      expect(INTERACTION.THRESHOLD.BASE).to.exist;
      expect(INTERACTION.THRESHOLD.BASE).to.be.a("number");
      expect(INTERACTION.THRESHOLD.BASE).to.equal(100.0);
    });

    it("should have RAY_DETECTION constants defined", () => {
      expect(INTERACTION.RAY_DETECTION).to.exist;
      expect(INTERACTION.RAY_DETECTION.MIN_COS_ANGLE).to.equal(0.5);
      expect(INTERACTION.RAY_DETECTION.DISTANCE_DIVISOR).to.equal(1000);
      expect(INTERACTION.RAY_DETECTION.MIN_SIZE_MULTIPLIER).to.equal(0.15);
      expect(INTERACTION.RAY_DETECTION.MAX_SIZE_MULTIPLIER).to.equal(1.0);
      expect(INTERACTION.RAY_DETECTION.DIRECTION_WEIGHT).to.equal(0.1);
    });

    it("should have THRESHOLD constants defined", () => {
      expect(INTERACTION.THRESHOLD.MIN).to.equal(5.0);
      expect(INTERACTION.THRESHOLD.DYNAMIC_FACTOR).to.equal(0.025);
    });
  });
});
