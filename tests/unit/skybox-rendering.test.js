const { expect } = window;

describe("Skybox rendering wiring", function () {
  it("renders skybox before the main scene", async function () {
    const response = await fetch("/src/js/core/main.js");
    const source = await response.text();

    const renderSkyboxIndex = source.indexOf("renderSkybox()");
    const mainRenderIndex = source.indexOf("renderer.render(scene, camera)");

    expect(renderSkyboxIndex).to.be.greaterThan(-1);
    expect(mainRenderIndex).to.be.greaterThan(-1);
    expect(renderSkyboxIndex).to.be.lessThan(mainRenderIndex);
  });

  it("initializes the skybox after the renderer is created", async function () {
    const response = await fetch("/src/js/core/main.js");
    const source = await response.text();

    const rendererIndex = source.indexOf("new THREE.WebGLRenderer");
    const skyboxIndex = source.indexOf("initSkybox");

    expect(rendererIndex).to.be.greaterThan(-1);
    expect(skyboxIndex).to.be.greaterThan(-1);
    expect(skyboxIndex).to.be.greaterThan(rendererIndex);
  });
});
