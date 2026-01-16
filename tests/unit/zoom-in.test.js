import { zoomIn } from "../../src/js/core/spacehelpers.js";

mocha.globals(["updateMinimap", "camera", "TWEEN"]);

describe("zoomIn", function () {
  beforeEach(function () {
    this.prevUpdateMinimap = window.updateMinimap;
    this.prevCamera = window.camera;
    this.prevTWEEN = window.TWEEN;

    window.updateMinimap = function () {};
    window.camera = {
      position: {
        z: 2000,
        target: {
          z: 2000,
          pz: 2000,
        },
      },
    };
  });

  afterEach(function () {
    if (typeof this.prevUpdateMinimap === "undefined") {
      delete window.updateMinimap;
    } else {
      window.updateMinimap = this.prevUpdateMinimap;
    }

    if (typeof this.prevCamera === "undefined") {
      delete window.camera;
    } else {
      window.camera = this.prevCamera;
    }

    if (typeof this.prevTWEEN === "undefined") {
      delete window.TWEEN;
    } else {
      window.TWEEN = this.prevTWEEN;
    }
  });

  it("does not overwrite target.z during tween update", function () {
    var lastTween = null;

    window.TWEEN = {
      Easing: {
        Sinusoidal: {
          InOut: function (k) {
            return k;
          },
        },
      },
      Tween: function (obj) {
        var tween = {
          _object: obj,
          _onUpdate: null,
          _onComplete: null,
          to: function () {
            return this;
          },
          easing: function () {
            return this;
          },
          start: function () {
            return this;
          },
          onUpdate: function (cb) {
            this._onUpdate = cb;
            return this;
          },
          onComplete: function (cb) {
            this._onComplete = cb;
            return this;
          },
        };
        lastTween = tween;
        return tween;
      },
    };

    zoomIn(4);
    expect(window.camera.position.target.z).to.equal(4);

    window.camera.position.z = 1500;
    expect(lastTween._onUpdate).to.equal(null);
    expect(window.camera.position.target.z).to.equal(4);
  });

  it("syncs target values on completion", function () {
    var lastTween = null;

    window.TWEEN = {
      Easing: {
        Sinusoidal: {
          InOut: function (k) {
            return k;
          },
        },
      },
      Tween: function (obj) {
        var tween = {
          _object: obj,
          _onUpdate: null,
          _onComplete: null,
          to: function () {
            return this;
          },
          easing: function () {
            return this;
          },
          start: function () {
            return this;
          },
          onUpdate: function (cb) {
            this._onUpdate = cb;
            return this;
          },
          onComplete: function (cb) {
            this._onComplete = cb;
            return this;
          },
        };
        lastTween = tween;
        return tween;
      },
    };

    zoomIn(4);
    window.camera.position.z = 4;
    lastTween._onComplete.call(lastTween._object);

    expect(window.camera.position.target.z).to.equal(4);
    expect(window.camera.position.target.pz).to.equal(4);
  });
});
