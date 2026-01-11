import { constrain } from "../utils/math.js";

var skybox;
var skyboxUniforms;

var cameraCube, sceneCube;

export function setupSkyboxScene() {
  cameraCube = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    10000000,
  );
  window.cameraCube = cameraCube;
  sceneCube = new THREE.Scene();
}

export function initSkybox(highres) {
  setLoadMessage("Loading internal stars");
  var r = "src/assets/textures/";

  if (highres == false) r += "s_";

  var urls = [
    r + "px.jpg",
    r + "nx.jpg",
    r + "py.jpg",
    r + "ny.jpg",
    r + "pz.jpg",
    r + "nz.jpg",
  ];

  setLoadMessage("Loading interstellar bodies");
  var textureCube = new THREE.CubeTextureLoader().load(
    urls,
    undefined,
    undefined,
    function(err) { console.error("Error loading skybox:", err); }
  );
  textureCube.anisotropy = window.maxAniso || 1;
  var shader = THREE.ShaderLib["cube"];
  shader.uniforms["tCube"].value = textureCube;
  shader.uniforms["opacity"] = { value: 1.0, type: "f" };
  skyboxUniforms = shader.uniforms;

  var shaderList = window.shaderList;

  var skyboxMat = new THREE.ShaderMaterial({
    fragmentShader: shaderList.cubemapcustom.fragment,
    vertexShader: shaderList.cubemapcustom.vertex,
    uniforms: shader.uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });

  skybox = new THREE.Mesh(new THREE.BoxGeometry(1000, 1000, 1000), skyboxMat);
  sceneCube.add(skybox);
}

export function updateSkybox(override) {
  cameraCube.rotation.order = "YXZ";

  var starModel = window.starModel;
  var rotating = window.rotating;
  var camera = window.camera;

  if (starModel) {
    var rot = starModel.rotation.clone();
    rot.x -= Math.PI / 4;
    rot.y += Math.PI / 4;
    cameraCube.rotation.copy(rot);
  } else {
    var rot = rotating.rotation.clone();
    rot.x -= Math.PI / 4;
    rot.y += Math.PI / 4;
    cameraCube.rotation.copy(rot);
  }
  cameraCube.fov = constrain(camera.position.z * 20.0, 60, 70);
  cameraCube.updateProjectionMatrix();

  // 星空背景亮度控制
  // 只在极近距离（< 10）时显示，其他距离按原公式衰减
  var skyboxBrightness = constrain(1.4 / camera.position.z, 0.0, 1.0);
  skyboxUniforms["opacity"].value = skyboxBrightness;
}

export function renderSkybox() {
  if (window.renderer && sceneCube && cameraCube) {
    window.renderer.render(sceneCube, cameraCube);
  }
}

window.setupSkyboxScene = setupSkyboxScene;
window.initSkybox = initSkybox;
window.updateSkybox = updateSkybox;
window.renderSkybox = renderSkybox;
