/**
 * Planet Model Module
 *
 * Handles loading and displaying GLB planet models for close-up views
 * of Fediverse instances. Replaces the shader-based star model.
 */
import * as THREE from "three";
import { attachPlanetModelName } from "../lib/planet-render-config.mjs";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const PLANET_GLB_PATHS = [
  "src/assets/textures/kamistar.glb",
  "src/assets/textures/planet_330_the_geographer.glb",
  "src/assets/textures/le_petit_prince.glb",
  "src/assets/textures/floating_fox.glb",
  "src/assets/textures/my_planet_christina_li.glb",
  "src/assets/textures/planet_325_the_king.glb",
  "src/assets/textures/planet_328_the_businessman.glb",
  "src/assets/textures/planet_329_lamplighter.glb",
];

let loader;
let dracoLoader;
let planetBaseScenes = []; // Array of loaded scenes
let loadPromise = null;

function getLoader() {
  if (!loader) {
    loader = new GLTFLoader();
    // Configure DRACOLoader for compressed GLB models
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
    );
    loader.setDRACOLoader(dracoLoader);
  }
  return loader;
}

/**
 * Preload all planet GLB models.
 * @returns {Promise<Array<THREE.Object3D>>} The loaded scenes
 */
export function preloadPlanetModel() {
  if (!loadPromise) {
    const promises = PLANET_GLB_PATHS.map((path) => {
      return new Promise((resolve, reject) => {
        getLoader().load(
          path,
          (gltf) => {
            const scene = gltf.scene || gltf.scenes[0];
            if (scene) {
              processLoadedScene(scene, path); // Pass path to identify model
              resolve(scene);
            } else {
              resolve(null);
            }
          },
          undefined,
          (err) => {
            console.error("Error loading planet GLB:", path, err);
            resolve(null); // Resolve null to avoid failing entire Promise.all
          },
        );
      });
    });

    loadPromise = Promise.all(promises).then((scenes) => {
      planetBaseScenes = scenes.filter((s) => s !== null);
      console.log(`Loaded ${planetBaseScenes.length} planet models.`);
      return planetBaseScenes;
    });
  }
  return loadPromise;
}

/**
 * Process a loaded scene with optional model-specific overrides
 * @param {THREE.Object3D} scene
 * @param {string} modelName
 */
function processLoadedScene(scene, modelName) {
  if (scene && modelName) {
    scene.userData = scene.userData || {};
    scene.userData.modelName = modelName;
  }
  scene.traverse((obj) => {
    if (obj.isMesh) {
      // Ensure smooth normals - compute if missing or flat
      if (obj.geometry) {
        // Check if normals need recomputation (for smoother shading)
        const hasNormals = obj.geometry.attributes.normal !== undefined;
        if (!hasNormals) {
          obj.geometry.computeVertexNormals();
          console.log(`[Planet] Computed normals for: ${obj.name}`);
        }
      }

      if (obj.material) {
        const mats = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        mats.forEach((mat) => {
          // Keep original GLB material parameters from Sketchfab
          // Only adjust texture filtering for quality
          [
            "map",
            "roughnessMap",
            "metalnessMap",
            "normalMap",
            "emissiveMap",
            "aoMap",
          ].forEach((mapType) => {
            if (mat[mapType]) {
              mat[mapType].anisotropy = 16;
              mat[mapType].minFilter = THREE.LinearMipmapLinearFilter;
              mat[mapType].magFilter = THREE.LinearFilter;
              mat[mapType].needsUpdate = true;
            }
          });

          mat.polygonOffset = false;
          mat.depthTest = true;
          mat.depthWrite = !mat.transparent;
          mat.flatShading = false;

          // Use studio HDR environment for proper PBR lighting
          if (mat.isMeshStandardMaterial) {
            mat.envMapIntensity = 1.0;
          }
          mat.needsUpdate = true;

          // Emissive overrides for Lamplighter model (GLB doesn't have emissive baked)
          if (modelName && modelName.includes("planet_329_lamplighter")) {
            const matName = (mat.name || "").toLowerCase();
            // Lamp glass panels (mat0_box_mat0_box)
            const isGlassPanel = matName.includes("mat0_box_mat0");
            if (isGlassPanel) {
              console.log("[Lamplighter] Applying emissive to glass:", matName);
              mat.emissive = new THREE.Color(0xffdd88);
              mat.emissiveIntensity = 2.0;
              mat.transparent = true;
              mat.opacity = 0.7;
              mat.side = THREE.DoubleSide;
              mat.depthWrite = false;
              mat.needsUpdate = true;
            }
            // Glowing orb (mat1_sphere)
            if (
              matName.includes("mat1_sphere") ||
              matName.includes("mat0_sphere_mat1")
            ) {
              mat.emissive = new THREE.Color(0xffee88);
              mat.emissiveIntensity = 2.5;
              mat.needsUpdate = true;
            }
          }
        });
      }
    }
  });
}

/**
 * Check if at least one planet model is loaded
 * @returns {boolean}
 */
export function isPlanetModelLoaded() {
  return planetBaseScenes.length > 0;
}

/**
 * Create a planet model instance compatible with window.starModel API.
 * @returns {THREE.Object3D} Planet model with setScale, setSpectralIndex, etc.
 */
export function createPlanetModel() {
  const root = new THREE.Object3D();
  root.name = "planetModelRoot";

  const placeholderGeo = new THREE.SphereGeometry(7.35144e-8, 32, 16);
  const placeholderMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.2, // Reduced for shinier look
    metalness: 0.8, // Increased for metallic look
  });
  const placeholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
  placeholderMesh.name = "planetPlaceholder";
  root.add(placeholderMesh);

  // Helper to process and add a specific base model
  root.setPlanetMesh = function (baseScene) {
    if (!baseScene) return;

    // Clear previous mesh
    if (this._planetMesh) {
      this.remove(this._planetMesh);
      this._planetMesh = null;
    }

    const existingPlaceholder = this.getObjectByName("planetPlaceholder");
    if (existingPlaceholder) this.remove(existingPlaceholder);

    const planetInstance = baseScene.clone(true);
    planetInstance.name = "planetMesh";
    attachPlanetModelName(planetInstance, baseScene);

    // Reset rotation to ensure clean state
    planetInstance.rotation.set(0, 0, 0);

    const meshesToRemove = [];
    planetInstance.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        obj.castShadow = true; // Enable shadows casting
        obj.receiveShadow = true; // Enable shadows receiving
        const name = (obj.name || "").toLowerCase();
        if (
          name.includes("ring") ||
          name.includes("orbit") ||
          name.includes("circle") ||
          name.includes("halo") ||
          name.includes("chair") ||
          name.includes("throne")
        ) {
          meshesToRemove.push(obj);
        }
      }
    });

    meshesToRemove.forEach((mesh) => {
      if (mesh.parent) mesh.parent.remove(mesh);
    });

    const box = new THREE.Box3().setFromObject(planetInstance);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const targetSize = 1.0;
    const normalizeScale = targetSize / (maxDim || 1); // Avoid div by zero
    const baseScaleMultiplier = 0.8;
    const finalNormScale = normalizeScale * baseScaleMultiplier;

    planetInstance.scale.set(finalNormScale, finalNormScale, finalNormScale);

    const center = box.getCenter(new THREE.Vector3());
    planetInstance.position.sub(center.multiplyScalar(finalNormScale));

    this.add(planetInstance);
    this._planetMesh = planetInstance;
    this._baseScale = finalNormScale;

    if (this._currentScale !== undefined) {
      this.setScale(this._currentScale);
    }

    planetInstance.visible = this.visible;
  };

  root.pickRandomModel = function () {
    if (planetBaseScenes.length === 0) return;
    const randomIndex = Math.floor(Math.random() * planetBaseScenes.length);
    this.setPlanetMesh(planetBaseScenes[randomIndex]);
  };

  preloadPlanetModel().then((scenes) => {
    // Initialize with a random model once loaded
    root.pickRandomModel();
  });

  root._currentSpectralIndex = 0.5;
  root._currentScale = 1.0;
  root._rotationSpeed = 0.0005;

  root.setSpectralIndex = function (index) {
    this._currentSpectralIndex = index;
  };

  root.setScale = function (scale) {
    this._currentScale = scale;
    const baseScale = this._baseScale || 1;
    const finalScale = scale * baseScale;

    if (this._planetMesh) {
      this._planetMesh.scale.set(finalScale, finalScale, finalScale);
    }

    // Force update matrix
    this.updateMatrix();
    this.updateMatrixWorld(true);

    const placeholder = this.getObjectByName("planetPlaceholder");
    if (placeholder) {
      placeholder.scale.set(scale, scale, scale);
    }
  };

  root.randomizeRotationSpeed = function () {
    // Random speed between 0.0010 and 0.0030
    // Includes random direction (50% chance for negative rotation)
    var speed = 0.001 + Math.random() * 0.002;
    var direction = Math.random() > 0.5 ? 1 : -1;
    this._rotationSpeed = speed * direction;
  };

  root.update = function () {
    // Rotation logic moved to inner mesh to persist across frames
    // because root.rotation is overwritten by main.js in animate()
    if (this._planetMesh) {
      this._planetMesh.rotation.y += this._rotationSpeed;

      if (this._planetMesh.visible !== this.visible) {
        this._planetMesh.visible = this.visible;
      }
    }
  };

  root.substars = [];

  root.visible = false;

  return root;
}

// Alias for compatibility with main.js expectation
export const makeStarModels = createPlanetModel;

window.preloadPlanetModel = preloadPlanetModel;
window.createPlanetModel = createPlanetModel;
window.isPlanetModelLoaded = isPlanetModelLoaded;

// Debug function - call from console: debugPlanetZFighting()
window.debugPlanetZFighting = function () {
  const cam = window.camera;
  const planetCam = window.planetCamera;
  const rend = window.renderer;
  const star = window.starModel;

  console.log("=== Dual Scene Debug Info ===");

  console.log("Main Camera:", {
    positionZ: cam?.position?.z,
    near: cam?.near,
    far: cam?.far,
  });

  console.log("Planet Camera:", {
    position: planetCam?.position,
    near: planetCam?.near,
    far: planetCam?.far,
    ratio: planetCam?.far / planetCam?.near,
  });

  console.log("Star Model:", {
    position: star?.position,
    parent: star?.parent?.name,
    visible: star?.visible,
    scale: star?.scale, // Shows Vector3 values
    baseScale: star?._baseScale,
    currentScale: star?._currentScale,
  });

  console.log("Renderer:", {
    logarithmicDepthBuffer: rend?.capabilities?.logarithmicDepthBuffer,
    precision: rend?.capabilities?.precision,
  });

  if (star?._planetMesh) {
    star._planetMesh.traverse((obj) => {
      if (obj.isMesh) {
        const mat = obj.material;
        console.log("Mesh:", obj.name, {
          visible: obj.visible,
          frustumCulled: obj.frustumCulled,
          material: {
            depthWrite: mat?.depthWrite,
            depthTest: mat?.depthTest,
            polygonOffset: mat?.polygonOffset,
          },
        });
      }
    });
  } else {
    console.log("Planet mesh not loaded yet");
  }
  console.log("=============================");
};
