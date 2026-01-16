/**
 * Draco Loader Local Fallback Tests
 *
 * Tests for P0-1: 离线 Draco 解码器策略
 * Ensures Draco decoder can be loaded from local path when CDN is unavailable.
 *
 * @see docs/plans/codebase-optimization-review.md
 */
import { expect } from "https://unpkg.com/chai/chai.js";

// Import the configuration that should define DRACO paths
import { DRACO, getDracoDecoderPath } from "../../src/js/core/constants.js";

describe("Draco Loader Configuration", () => {
  describe("DRACO constants", () => {
    it("should have DRACO configuration defined in constants", () => {
      expect(DRACO).to.exist;
      expect(DRACO).to.be.an("object");
    });

    it("should define LOCAL_PATH for offline decoder", () => {
      expect(DRACO.LOCAL_PATH).to.exist;
      expect(DRACO.LOCAL_PATH).to.be.a("string");
      expect(DRACO.LOCAL_PATH).to.include("draco");
    });

    it("should define CDN_PATH for remote decoder", () => {
      expect(DRACO.CDN_PATH).to.exist;
      expect(DRACO.CDN_PATH).to.be.a("string");
      expect(DRACO.CDN_PATH).to.include("gstatic.com");
    });

    it("should have PREFER_LOCAL flag", () => {
      expect(DRACO.PREFER_LOCAL).to.exist;
      expect(DRACO.PREFER_LOCAL).to.be.a("boolean");
    });

    it("should set PREFER_LOCAL to true by default", () => {
      // P0-1 requirement: local first to avoid network dependency
      expect(DRACO.PREFER_LOCAL).to.equal(true);
    });
  });

  describe("getDracoDecoderPath function", () => {
    it("should be exported from constants", () => {
      expect(getDracoDecoderPath).to.exist;
      expect(getDracoDecoderPath).to.be.a("function");
    });

    it("should return LOCAL_PATH when PREFER_LOCAL is true", () => {
      // Save original value
      const originalPreferLocal = DRACO.PREFER_LOCAL;

      // Test with PREFER_LOCAL = true
      DRACO.PREFER_LOCAL = true;
      const path = getDracoDecoderPath();
      expect(path).to.equal(DRACO.LOCAL_PATH);

      // Restore original value
      DRACO.PREFER_LOCAL = originalPreferLocal;
    });

    it("should return CDN_PATH when PREFER_LOCAL is false", () => {
      // Save original value
      const originalPreferLocal = DRACO.PREFER_LOCAL;

      // Test with PREFER_LOCAL = false
      DRACO.PREFER_LOCAL = false;
      const path = getDracoDecoderPath();
      expect(path).to.equal(DRACO.CDN_PATH);

      // Restore original value
      DRACO.PREFER_LOCAL = originalPreferLocal;
    });
  });
});

describe("Local Draco Decoder Files", () => {
  it("should have draco_decoder.js file available locally", async () => {
    const response = await fetch("src/assets/draco/draco_decoder.js", {
      method: "HEAD",
    });
    expect(response.ok).to.equal(true);
  });

  it("should have draco_decoder.wasm file available locally", async () => {
    const response = await fetch("src/assets/draco/draco_decoder.wasm", {
      method: "HEAD",
    });
    expect(response.ok).to.equal(true);
  });

  it("should have draco_wasm_wrapper.js file available locally", async () => {
    const response = await fetch("src/assets/draco/draco_wasm_wrapper.js", {
      method: "HEAD",
    });
    expect(response.ok).to.equal(true);
  });
});
