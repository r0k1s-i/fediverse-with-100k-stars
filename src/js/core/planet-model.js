/**
 * Planet Model Module
 *
 * Handles loading and displaying GLB planet models for close-up views
 * of Fediverse instances. Replaces the shader-based star model.
 */
import * as THREE from "three";
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
  "src/assets/textures/planet_329_lamplighter.glb"
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
    const promises = PLANET_GLB_PATHS.map(path => {
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
                }
            );
        });
    });

    loadPromise = Promise.all(promises).then(scenes => {
        planetBaseScenes = scenes.filter(s => s !== null);
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
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach((mat) => {
                    // Keep original GLB material parameters - only adjust texture filtering and environment
                    ['map', 'roughnessMap', 'metalnessMap', 'normalMap', 'emissiveMap', 'aoMap'].forEach(mapType => {
                        if (mat[mapType]) {
                            mat[mapType].anisotropy = 16;
                            mat[mapType].minFilter = THREE.LinearMipmapLinearFilter;
                            mat[mapType].magFilter = THREE.LinearFilter;
                            mat[mapType].needsUpdate = true;
                        }
                    });
                    
                    mat.polygonOffset = false;
                    mat.depthTest = true;
                    mat.depthWrite = !mat.transparent; // Preserve transparency settings
                    mat.flatShading = false;
                    
                    if (mat.isMeshStandardMaterial) {
                        // Reduce star field reflection to avoid moiré - original GLB was lit by studio lighting
                        mat.envMapIntensity = 0.3; 
                    }
                    mat.needsUpdate = true;

                    // Special overrides for "The Lamplighter" (planet_329_lamplighter.glb)
                    if (modelName && modelName.includes("planet_329_lamplighter")) {
                        const matName = (mat.name || "").toLowerCase();
                        const objName = (obj.name || "").toLowerCase();
                        
                        console.log(`[Lamplighter Debug] Mesh: ${objName}, Mat: ${matName}`);

                        // Detect parts by material/object name
                        // mat0_box_mat0_box = glass panels (the 4 sides)
                        // mat1_box, mat2_box = gold frame bars
                        const isBox = matName.includes("box");
                        const isBoxFrame = matName.includes("mat1_box") || matName.includes("mat2_box");
                        const isBoxGlass = isBox && !isBoxFrame; // mat0_box_mat0_box = glass
                        const isTube = matName.includes("tube");
                        const isPole = matName.includes("pole");
                        const isTop = matName.includes("top");
                        const isBase = matName.includes("base");
                        const isSphere = matName.includes("sphere");
                        // mat1_sphere = glowing orb, mat0_sphere = planet surface
                        const isGlowingOrb = matName.includes("mat1_sphere") || matName.includes("mat0_sphere_mat1");
                        const isPlanetSphere = isSphere && !isGlowingOrb;

                        // Re-enable environment map for this model
                        mat.envMapIntensity = 0.5;

                        if (isBoxGlass) {
                            // Lamp glass panels - transparent with warm glow
                            console.log(`[Lamplighter] -> LAMP GLASS PANEL`);
                            mat.map = null;
                            mat.roughnessMap = null;
                            mat.metalnessMap = null;
                            mat.envMap = null;
                            mat.envMapIntensity = 0;
                            mat.roughness = 0.1;
                            mat.metalness = 0.0;
                            if (mat.emissive) mat.emissive.setHex(0xFFDD88);
                            else mat.emissive = new THREE.Color(0xFFDD88);
                            mat.emissiveIntensity = 1.5;
                            if (mat.color) mat.color.setHex(0xFFFFEE);
                            mat.transparent = true;
                            mat.opacity = 0.6;
                            mat.side = THREE.DoubleSide;
                            mat.depthWrite = false;
                        } else if (isBoxFrame) {
                            // Gold lamp frame
                            console.log(`[Lamplighter] -> LAMP FRAME`);
                            mat.roughness = 0.4;
                            mat.metalness = 0.7;
                            if (mat.emissive) mat.emissive.setHex(0x000000);
                            mat.emissiveIntensity = 0.0;
                        } else if (isGlowingOrb) {
                            // Small glowing orb (the lantern the lamplighter carries)
                            console.log(`[Lamplighter] -> GLOWING ORB`);
                            mat.map = null;
                            mat.envMapIntensity = 0;
                            mat.roughness = 1.0;
                            mat.metalness = 0.0;
                            if (mat.emissive) mat.emissive.setHex(0xFFEE88);
                            else mat.emissive = new THREE.Color(0xFFEE88);
                            mat.emissiveIntensity = 2.5;
                            if (mat.color) mat.color.setHex(0xFFFFCC);
                            mat.toneMapped = false;
                        } else if (isPole) {
                            // Lamp pole - dark green metal
                            console.log(`[Lamplighter] -> POLE`);
                            mat.roughness = 0.6;
                            mat.metalness = 0.4;
                            if (mat.emissive) mat.emissive.setHex(0x000000);
                            mat.emissiveIntensity = 0.0;
                        } else if (isTube) {
                            // Curved road/path - brown/tan color, no glow
                            console.log(`[Lamplighter] -> ROAD/PATH`);
                            mat.roughness = 0.8;
                            mat.metalness = 0.1;
                            if (mat.emissive) mat.emissive.setHex(0x000000);
                            mat.emissiveIntensity = 0.0;
                        } else if (isPlanetSphere) {
                            // Planet surface - soft matte pinkish-gray
                            console.log(`[Lamplighter] -> PLANET`);
                            mat.roughness = 0.85;
                            mat.metalness = 0.05;
                            if (mat.color) mat.color.setHex(0xD8D0D0);
                            if (mat.emissive) mat.emissive.setHex(0x000000);
                            mat.envMapIntensity = 0.1;
                            mat.emissiveIntensity = 0.0;
                        } else {
                            // Other parts (roof, base, etc)
                            console.log(`[Lamplighter] -> OTHER: ${objName}`);
                            mat.roughness = 0.5;
                            mat.metalness = 0.6;
                            if (mat.emissive) mat.emissive.setHex(0x000000);
                            mat.emissiveIntensity = 0.0;
                        }
                        mat.needsUpdate = true;
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
  root.setPlanetMesh = function(baseScene) {
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

  root.pickRandomModel = function() {
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
    var speed = 0.0010 + Math.random() * 0.0020;
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
    currentScale: star?._currentScale
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
