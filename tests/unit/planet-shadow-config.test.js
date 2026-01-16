const { expect } = window;
import {
  getPlanetShadowConfig,
  applyPlanetShadowConfig,
} from "../../src/js/lib/planet-shadow-config.mjs";

describe("Planet shadow config", function () {
  it("provides default shadow tuning values", function () {
    var config = getPlanetShadowConfig();
    expect(config.bias).to.equal(-0.0002);
    expect(config.normalBias).to.equal(0.02);
    expect(config.radius).to.equal(2);
    expect(config.mapSize).to.deep.equal({ width: 1024, height: 1024 });
  });

  it("applies shadow tuning to a light shadow object", function () {
    var light = {
      shadow: {
        bias: 0,
        normalBias: 0,
        radius: 0,
        mapSize: { width: 256, height: 256 },
      },
    };

    applyPlanetShadowConfig(light, getPlanetShadowConfig());

    expect(light.shadow.bias).to.equal(-0.0002);
    expect(light.shadow.normalBias).to.equal(0.02);
    expect(light.shadow.radius).to.equal(2);
    expect(light.shadow.mapSize.width).to.equal(1024);
    expect(light.shadow.mapSize.height).to.equal(1024);
  });
});
