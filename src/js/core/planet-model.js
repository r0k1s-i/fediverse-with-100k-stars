/**
 * Planet Model Module
 *
 * Handles loading and displaying GLB planet models for close-up views
 * of Fediverse instances. Replaces the shader-based star model.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const PLANET_GLB_PATH = "src/assets/textures/kamistar.glb";

let loader;
let dracoLoader;
let planetBaseScene = null;
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
 * Preload the planet GLB model.
 * Call this early to avoid loading delay on first click.
 * @returns {Promise<THREE.Object3D|null>} The loaded scene or null on error
 */
export function preloadPlanetModel() {
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      getLoader().load(
        PLANET_GLB_PATH,
        (gltf) => {
          planetBaseScene = gltf.scene || gltf.scenes[0];
          if (planetBaseScene) {
            planetBaseScene.traverse((obj) => {
              if (obj.isMesh) {
                // We don't remove meshes here, we do it on instantiation
                // just so we don't destructively modify the cached asset too much
                
                if (obj.material) {
                  const mats = Array.isArray(obj.material)
                    ? obj.material
                    : [obj.material];
                  
                  mats.forEach((mat) => {
                    if (mat.map) {
                      mat.map.anisotropy = 16;
                      mat.map.minFilter = THREE.LinearMipmapLinearFilter;
                      mat.map.magFilter = THREE.LinearFilter;
                      mat.map.needsUpdate = true;
                    }
                    // Standard depth settings are sufficient now that we use
                    // relative coordinate rendering in main.js
                    mat.polygonOffset = false;
                    mat.depthTest = true;
                    mat.depthWrite = true;
                  });
                }
              }
            });
            console.log("Planet GLB loaded successfully:", PLANET_GLB_PATH);
          }
          resolve(planetBaseScene);
        },
        (progress) => {
          if (progress.lengthComputable) {
            const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
            console.log(`Loading planet model: ${percent}%`);
          }
        },
        (err) => {
          console.error("Error loading planet GLB:", PLANET_GLB_PATH, err);
          planetBaseScene = null;
          resolve(null);
        }
      );
    });
  }
  return loadPromise;
}

/**
 * Check if the planet model is loaded
 * @returns {boolean}
 */
export function isPlanetModelLoaded() {
  return planetBaseScene !== null;
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
    roughness: 0.7,
    metalness: 0.3,
  });
  const placeholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
  placeholderMesh.name = "planetPlaceholder";
  root.add(placeholderMesh);

  preloadPlanetModel().then((base) => {
    if (!base) return;

    const existing = root.getObjectByName("planetPlaceholder");
    if (existing) root.remove(existing);

    const planetInstance = base.clone(true);
    planetInstance.name = "planetMesh";

    const meshesToRemove = [];
    
    // We traverse again to remove unwanted meshes and set renderOrder
    let instanceMeshCounter = 0;
    
    planetInstance.traverse((obj) => {
      if (obj.isMesh) {
        instanceMeshCounter++;
        
        obj.frustumCulled = false;
        
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

    // Increase base scale to ensure visibility
    // Target size 1.0 (in light years) provides a good balance: visible but not overwhelming
    const targetSize = 1.0; 
    const normalizeScale = targetSize / maxDim;
    planetInstance.scale.set(normalizeScale, normalizeScale, normalizeScale);

    const center = box.getCenter(new THREE.Vector3());
    planetInstance.position.sub(center.multiplyScalar(normalizeScale));

    root.add(planetInstance);
    root._planetMesh = planetInstance;
    root._baseScale = normalizeScale;

    console.log("Planet mesh attached to root");
  });

  root._currentSpectralIndex = 0.5;
  root._currentScale = 1.0;

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

    const placeholder = this.getObjectByName("planetPlaceholder");
    if (placeholder) {
      placeholder.scale.set(scale, scale, scale);
    }
  };

  root.randomizeSolarFlare = function () {};

  root.update = function () {
    this.rotation.y += 0.002;
  };

  root.substars = [];

  root.visible = false;

  return root;
}

window.preloadPlanetModel = preloadPlanetModel;
window.createPlanetModel = createPlanetModel;
window.isPlanetModelLoaded = isPlanetModelLoaded;

// Debug function - call from console: debugPlanetZFighting()
window.debugPlanetZFighting = function () {
  const cam = window.camera;
  const rend = window.renderer;
  const star = window.starModel;

  console.log("=== Z-Fighting Debug Info ===");
  console.log("Camera:", {
    positionZ: cam?.position?.z,
    near: cam?.near,
    far: cam?.far,
    ratio: cam?.far / cam?.near,
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
          renderOrder: obj.renderOrder,
          frustumCulled: obj.frustumCulled,
          material: {
            depthWrite: mat?.depthWrite,
            depthTest: mat?.depthTest,
            polygonOffset: mat?.polygonOffset,
            polygonOffsetFactor: mat?.polygonOffsetFactor,
            transparent: mat?.transparent,
            opacity: mat?.opacity,
            side: mat?.side,
            sideLabel:
              mat?.side === 0
                ? "FrontSide"
                : mat?.side === 1
                  ? "BackSide"
                  : "DoubleSide",
          },
        });
      }
    });
  } else {
    console.log("Planet mesh not loaded yet");
  }
  console.log("=============================");
};
