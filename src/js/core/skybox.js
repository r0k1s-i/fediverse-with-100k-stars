import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
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

  // highres uses .jpg files (optimized from png), lowres uses s_*.jpg files

  var urls;
  if (highres) {
    urls = [
      r + "px.jpg",
      r + "nx.jpg",
      r + "py.jpg",
      r + "ny.jpg",
      r + "pz.jpg",
      r + "nz.jpg",
    ];
  } else {
    urls = [
      r + "s_px.jpg",
      r + "s_nx.jpg",
      r + "s_py.jpg",
      r + "s_ny.jpg",
      r + "s_pz.jpg",
      r + "s_nz.jpg",
    ];
  }

  setLoadMessage("Loading interstellar bodies");
  var textureCube = new THREE.CubeTextureLoader().load(
    urls,
    function (loadedTexture) {
      console.log("[Skybox] Starfield cubemap loaded");
    },
    undefined,
    function (err) {
      console.error("Error loading skybox:", err);
    },
  );
  window.skyboxTexture = textureCube; // For visual background only
  
  // Load studio HDR for PBR reflections (separate from starfield background)
  loadStudioEnvironment();
  textureCube.anisotropy = window.maxAniso || 1;
  // Enable mipmaps for better filtering
  textureCube.magFilter = THREE.LinearFilter;
  textureCube.minFilter = THREE.LinearMipmapLinearFilter;
  textureCube.generateMipmaps = true;

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
  // 提高基础亮度，让默认视距下星空更明显
  var skyboxBrightness = constrain(4.0 / camera.position.z, 0.0, 1.0);
  skyboxUniforms["opacity"].value = skyboxBrightness;
}

export function renderSkybox() {
  if (window.renderer && sceneCube && cameraCube) {
    window.renderer.render(sceneCube, cameraCube);
  }
}

/**
 * Load studio HDR environment for PBR reflections.
 * This is separate from the starfield background - used only for lighting GLB models.
 */
function loadStudioEnvironment() {
  if (!window.renderer) {
    console.warn("[Skybox] Renderer not ready, deferring studio environment load");
    return;
  }
  
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load(
    "src/assets/textures/studio_small_1k.hdr",
    function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      
      const pmremGenerator = new THREE.PMREMGenerator(window.renderer);
      pmremGenerator.compileEquirectangularShader();
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      
      window.studioEnvMap = envMap;
      
      // Apply to planetScene for PBR model reflections
      if (window.planetScene) {
        window.planetScene.environment = envMap;
        console.log("[Skybox] Studio HDR environment applied to planetScene");
      }
      
      // Reduce exposure to avoid overexposure with bright HDR
      if (window.renderer) {
        window.renderer.toneMappingExposure = 0.35;
      }
      
      texture.dispose();
      pmremGenerator.dispose();
    },
    undefined,
    function (err) {
      console.error("[Skybox] Error loading studio HDR:", err);
    }
  );
}

window.setupSkyboxScene = setupSkyboxScene;
window.initSkybox = initSkybox;
window.updateSkybox = updateSkybox;
window.renderSkybox = renderSkybox;
window.loadStudioEnvironment = loadStudioEnvironment;
