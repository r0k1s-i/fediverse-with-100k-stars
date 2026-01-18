/**
 * Planet Model Module
 *
 * Handles loading and displaying GLB planet models for close-up views
 * of Fediverse instances. Replaces the shader-based star model.
 */
import * as THREE from "three";
import { attachPlanetModelName } from "../lib/planet-render-config.mjs";
import {
  createPlanetInternalLight,
  getPlanetInternalLightConfig,
  shouldAttachPlanetInternalLight,
} from "../lib/planet-lighting.mjs";
import {
  isUniverseModel,
  isLamplighterModel,
  isUniverseShellMaterial,
  hasUniverseShellMaterial,
  isDuplicateMeshName,
  isDuplicateMaterialName,
} from "../lib/model-config.mjs";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { getDracoDecoderPaths } from "./constants.js";
import { state } from "./state.js";
import { Gyroscope } from "./Gyroscope.js";
import { AssetManager } from "./asset-manager.js";

// Explicit Draco probe model - used to verify decoder before parallel loading
const DRACO_PROBE_MODEL = "src/assets/textures/kamistar.glb";

const PLANET_GLB_PATHS = [
  DRACO_PROBE_MODEL,
  "src/assets/textures/planet_330_the_geographer.glb",
  "src/assets/textures/le_petit_prince.glb",
  "src/assets/textures/floating_fox.glb",
  "src/assets/textures/my_planet_christina_li.glb",
  "src/assets/textures/planet_325_the_king.glb",
  "src/assets/textures/planet_328_the_businessman.glb",
  "src/assets/textures/planet_329_lamplighter.glb",
];

const SUPERGIANT_MODELS = {
  "mastodon.social": "src/assets/textures/universe.glb",
  "pixelfed.social": "src/assets/textures/disco_ball.glb",
  "misskey.io": "src/assets/textures/futuristic_sci-fi_planet_scanner_radar.glb",
};

const SUPERGIANT_MODEL_PATHS = new Set(Object.values(SUPERGIANT_MODELS));

let loader;
let dracoLoader;
let currentDecoderPathIndex = 0;
let decoderPaths = [];
let planetBaseScenes = []; // Array of loaded scenes
let loadPromise = null;

// Lazy loading state
let decoderReady = false;
let decoderInitPromise = null;
const loadedModelCache = new Map(); // path -> scene
const pendingLoads = new Map(); // path -> Promise

// Glow textures (loaded once)
let haloTexture = null;
let coronaTexture = null;
const textureLoader = AssetManager.getInstance();

/**
 * Initialize the GLTF loader with DRACOLoader (first call only)
 * @returns {GLTFLoader} Configured loader instance
 */
function getLoader() {
  if (!decoderPaths.length) {
    decoderPaths = getDracoDecoderPaths();
  }

  if (!loader) {
    loader = new GLTFLoader();
    dracoLoader = new DRACOLoader();
    loader.setDRACOLoader(dracoLoader);
    // Set initial decoder path
    dracoLoader.setDecoderPath(decoderPaths[0]);
  }

  return loader;
}

/**
 * Switch to fallback decoder path
 * @returns {boolean} True if fallback is available, false if already on last path
 */
function switchToFallbackDecoder() {
  if (!decoderPaths.length) {
    decoderPaths = getDracoDecoderPaths();
  }

  if (currentDecoderPathIndex < decoderPaths.length - 1) {
    currentDecoderPathIndex++;
    const fallbackPath = decoderPaths[currentDecoderPathIndex];
    dracoLoader.setDecoderPath(fallbackPath);
    return true;
  }
  return false;
}

/**
 * Load a single GLB model (no fallback logic - decoder must be verified first)
 * @param {string} path - Path to the GLB file
 * @returns {Promise<THREE.Object3D|null>} Loaded scene or null on failure
 */
function loadGLB(path) {
  return new Promise((resolve) => {
    getLoader().load(
      path,
      (gltf) => {
        const scene = gltf.scene || gltf.scenes[0];
        if (scene) {
          processLoadedScene(scene, path);
          resolve(scene);
        } else {
          resolve(null);
        }
      },
      undefined,
      (err) => {
        console.error("Error loading planet GLB:", path, err);
        resolve(null);
      },
    );
  });
}

/**
 * Test if decoder works by loading a probe model
 * @param {string} probePath - Path to test model (must use Draco compression)
 * @returns {Promise<{success: boolean, scene: THREE.Object3D|null, isDracoError: boolean}>}
 */
function probeDecoder(probePath) {
  return new Promise((resolve) => {
    getLoader().load(
      probePath,
      (gltf) => {
        const scene = gltf.scene || gltf.scenes[0];
        if (scene) {
          processLoadedScene(scene, probePath);
          resolve({ success: true, scene, isDracoError: false });
        } else {
          resolve({ success: false, scene: null, isDracoError: false });
        }
      },
      undefined,
      (err) => {
        // Detect Draco decoder failures (not 404 or other HTTP errors)
        const msg = err?.message?.toLowerCase() || "";
        const isDracoError =
          msg.includes("draco") ||
          msg.includes("decoder") ||
          msg.includes("wasm");
        resolve({ success: false, scene: null, isDracoError });
      },
    );
  });
}

/**
 * Initialize the Draco decoder (probe once to verify it works).
 * This is called lazily on first model request.
 * @returns {Promise<boolean>} True if decoder is ready
 */
async function ensureDecoderReady() {
  if (decoderReady) return true;

  if (!decoderInitPromise) {
    decoderInitPromise = (async () => {
      getLoader();

      // Step 1: Probe with explicit Draco model to verify decoder
      let probeResult = await probeDecoder(DRACO_PROBE_MODEL);

      // Step 2: If probe failed with Draco error, try fallback decoder
      if (!probeResult.success && probeResult.isDracoError) {
        if (switchToFallbackDecoder()) {
          console.warn(
            "[Draco] Primary decoder failed, retrying with fallback...",
          );
          probeResult = await probeDecoder(DRACO_PROBE_MODEL);
        }
      }

      // Step 3: Short-circuit if decoder unavailable
      if (!probeResult.success && probeResult.isDracoError) {
        console.error(
          "[Draco] All decoder paths failed. Cannot load Draco-compressed models.",
        );
        return false;
      }

      // Cache the probe model
      if (probeResult.scene) {
        loadedModelCache.set(DRACO_PROBE_MODEL, probeResult.scene);
        planetBaseScenes.push(probeResult.scene);
      }

      decoderReady = true;
      return true;
    })();
  }

  return decoderInitPromise;
}

/**
 * Load a single model on-demand (lazy loading).
 * @param {string} path - Path to the GLB file
 * @returns {Promise<THREE.Object3D|null>} Loaded scene or null on failure
 */
export async function loadModelOnDemand(path) {
  // Return cached model if already loaded
  if (loadedModelCache.has(path)) {
    return loadedModelCache.get(path);
  }

  // Return pending promise if already loading
  if (pendingLoads.has(path)) {
    return pendingLoads.get(path);
  }

  // Ensure decoder is ready first
  const ready = await ensureDecoderReady();
  if (!ready) return null;

  // Start loading
  const loadingPromise = loadGLB(path).then((scene) => {
    if (scene) {
      loadedModelCache.set(path, scene);
      if (!SUPERGIANT_MODEL_PATHS.has(path)) {
        planetBaseScenes.push(scene);
      }
    }
    pendingLoads.delete(path);
    return scene;
  });

  pendingLoads.set(path, loadingPromise);
  return loadingPromise;
}

/**
 * Load a random model on-demand (for when user zooms in).
 * @returns {Promise<THREE.Object3D|null>} Loaded scene or null
 */
export async function loadRandomModel() {
  const ready = await ensureDecoderReady();
  if (!ready) return null;

  // If we have cached models, return one randomly
  if (planetBaseScenes.length > 0) {
    const randomIndex = Math.floor(Math.random() * planetBaseScenes.length);
    return planetBaseScenes[randomIndex];
  }

  // Otherwise load a random model from the list
  const availablePaths = PLANET_GLB_PATHS.filter(
    (p) => !loadedModelCache.has(p),
  );
  if (availablePaths.length === 0) {
    // All loaded, pick random from planetBaseScenes (already excludes supergiants)
    if (planetBaseScenes.length > 0) {
      return planetBaseScenes[Math.floor(Math.random() * planetBaseScenes.length)];
    }
    return null;
  }

  const randomPath =
    availablePaths[Math.floor(Math.random() * availablePaths.length)];
  return loadModelOnDemand(randomPath);
}

/**
 * Preload all planet GLB models with fallback decoder support.
 *
 * NOTE: This function is kept for backward compatibility but now
 * only initializes the decoder. Models are loaded on-demand.
 * Call preloadAllModels() to eagerly load all models.
 *
 * @returns {Promise<Array<THREE.Object3D>>} The loaded scenes (initially just probe model)
 */
export function preloadPlanetModel() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const ready = await ensureDecoderReady();
      if (!ready) {
        planetBaseScenes = [];
      }
      return planetBaseScenes;
    })();
  }
  return loadPromise;
}

/**
 * Eagerly preload all planet models (optional, for better UX when user is idle).
 * @returns {Promise<Array<THREE.Object3D>>} All loaded scenes
 */
export async function preloadAllModels() {
  const ready = await ensureDecoderReady();
  if (!ready) return [];

  const loadPromises = PLANET_GLB_PATHS.map((path) => loadModelOnDemand(path));
  await Promise.all(loadPromises);

  return planetBaseScenes;
}

/**
 * Process a loaded scene with model-specific overrides.
 * This is the SINGLE processing pipeline for all model customizations.
 * All model-specific logic (universe.glb, lamplighter, etc.) is handled here.
 * 
 * @param {THREE.Object3D} scene
 * @param {string} modelName
 */
function processLoadedScene(scene, modelName) {
  if (!scene) {
    console.warn("[Planet] Loaded scene is empty:", modelName);
    return;
  }
  
  // Store model name in userData for later reference
  scene.userData = scene.userData || {};
  scene.userData.modelName = modelName;
  
  const isUniverse = isUniverseModel(modelName);
  const isLamplighter = isLamplighterModel(modelName);
  
  // ===== UNIVERSE.GLB SPECIFIC: Hide duplicate .001 meshes =====
  if (isUniverse) {
    scene.traverse((obj) => {
      const name = obj.name || "";
      
      // For meshes: check if any material is a shell material
      // For non-meshes: no shell check needed (they're containers)
      const isShell = obj.isMesh ? hasUniverseShellMaterial(obj.material) : false;
      
      // Hide .001 suffix duplicates (opaque copies blocking transparent originals)
      // But keep shell materials visible for glass effect
      if (isDuplicateMeshName(name) && !isShell) {
        obj.visible = false;
        return;
      }
      
      // Also hide by material name, but keep shell materials (meshes only)
      if (obj.isMesh && obj.material && !isShell) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const hasDuplicateMat = mats.some((m) => isDuplicateMaterialName(m.name || ""));
        if (hasDuplicateMat) {
          obj.visible = false;
        }
      }
    });
    
    // Set render order for transparent objects
    scene.traverse((obj) => {
      if (obj.isMesh && obj.material && obj.material.transparent) {
        obj.renderOrder = 100;
      }
    });
  }
  
  // ===== COMMON MESH PROCESSING =====
  scene.traverse((obj) => {
    if (obj.isMesh) {
      // Compute normals if missing
      if (obj.geometry && !obj.geometry.attributes.normal) {
        obj.geometry.computeVertexNormals();
      }

      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        
        mats.forEach((originalMat, idx) => {
          let mat = originalMat;
          
          // ===== UNIVERSE.GLB: Upgrade to MeshPhysicalMaterial for clearcoat =====
          if (isUniverse && mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) {
            const physMat = new THREE.MeshPhysicalMaterial();
            THREE.MeshStandardMaterial.prototype.copy.call(physMat, mat);
            physMat.clearcoat = 1.0;
            physMat.clearcoatRoughness = 0.0;
            physMat.name = mat.name;
            
            if (Array.isArray(obj.material)) {
              obj.material[idx] = physMat;
            } else {
              obj.material = physMat;
            }
            mat = physMat;
          }
          
          // ===== UNIVERSE.GLB: Apply shell glass effect =====
          if (isUniverse && isUniverseShellMaterial(mat)) {
            mat.transparent = true;
            mat.opacity = 0.25;
            mat.depthWrite = false;
            mat.depthTest = true;
            mat.side = THREE.DoubleSide;
            obj.renderOrder = 10;
            if ("transmission" in mat) mat.transmission = 0.6;
            if ("thickness" in mat) mat.thickness = 0.2;
            mat.needsUpdate = true;
          }
          
          // Texture quality settings
          ["map", "roughnessMap", "metalnessMap", "normalMap", "emissiveMap", "aoMap"].forEach((mapType) => {
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

          if (mat.isMeshStandardMaterial) {
            mat.envMapIntensity = 1.0;
          }
          mat.needsUpdate = true;

          // ===== LAMPLIGHTER: Emissive overrides =====
          if (isLamplighter) {
            const matName = (mat.name || "").toLowerCase();
            // Lamp glass panels
            if (matName.includes("mat0_box_mat0")) {
              mat.emissive = new THREE.Color(0xffdd88);
              mat.emissiveIntensity = 2.0;
              mat.transparent = true;
              mat.opacity = 0.7;
              mat.side = THREE.DoubleSide;
              mat.depthWrite = false;
              mat.needsUpdate = true;
            }
            // Glowing orb
            if (matName.includes("mat1_sphere") || matName.includes("mat0_sphere_mat1")) {
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
 * Load glow textures for planet halo effect
 */
function loadGlowTextures() {
  if (!haloTexture) {
    haloTexture = textureLoader.loadTexture("src/assets/textures/sun_halo.png");
  }
  if (!coronaTexture) {
    coronaTexture = textureLoader.loadTexture("src/assets/textures/corona.png");
  }
}

/**
 * Create halo plane for glow effect around planet
 * @param {Object} uniforms - Shader uniforms
 * @returns {THREE.Mesh}
 */
function makePlanetHalo(uniforms) {
  const shaderList = state.shaderList;
  if (!shaderList || !shaderList.starhalo) {
    // Fallback to basic material if shaders not loaded
    const haloGeo = new THREE.PlaneGeometry(0.00000022, 0.00000022);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0.8,
    });
    return new THREE.Mesh(haloGeo, haloMat);
  }

  const haloGeo = new THREE.PlaneGeometry(0.00000022, 0.00000022);
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: shaderList.starhalo.vertex,
    fragmentShader: shaderList.starhalo.fragment,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 100,
  });

  const halo = new THREE.Mesh(haloGeo, haloMaterial);
  halo.position.set(0, 0, 0);
  return halo;
}

/**
 * Create glow plane for corona effect around planet
 * @param {Object} uniforms - Shader uniforms
 * @returns {THREE.Mesh}
 */
function makePlanetGlow(uniforms) {
  const shaderList = state.shaderList;
  if (!shaderList || !shaderList.corona) {
    // Fallback to basic material if shaders not loaded
    const glowGeo = new THREE.PlaneGeometry(0.0000012, 0.0000012);
    const glowMat = new THREE.MeshBasicMaterial({
      map: coronaTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      opacity: 0.6,
    });
    return new THREE.Mesh(glowGeo, glowMat);
  }

  const glowGeo = new THREE.PlaneGeometry(0.0000012, 0.0000012);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    blending: THREE.AdditiveBlending,
    fragmentShader: shaderList.corona.fragment,
    vertexShader: shaderList.corona.vertex,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: 100,
    depthTest: true,
    depthWrite: true,
  });

  const glow = new THREE.Mesh(glowGeo, glowMaterial);
  glow.position.set(0, 0, 0);
  return glow;
}

/**
 * Create a planet model instance compatible with window.starModel API.
 * @returns {THREE.Object3D} Planet model with setScale, setSpectralIndex, etc.
 */
export function createPlanetModel() {
  const root = new THREE.Object3D();
  root.name = "planetModelRoot";

  // Load glow textures
  loadGlowTextures();

  // Get color lookup texture for spectral coloring
  const starColorGraph = window.starColorGraph || window.fediverseColorGraph;
  const sunHaloColorTexture = textureLoader.loadTexture(
    "src/assets/textures/halo_colorshift.png",
  );

  // Setup uniforms for halo and glow shaders
  const haloUniforms = {
    texturePrimary: { value: haloTexture },
    textureColor: { value: sunHaloColorTexture },
    time: { value: 0 },
    textureSpectral: { value: starColorGraph },
    spectralLookup: { value: 0.5 },
  };

  const coronaUniforms = {
    texturePrimary: { value: coronaTexture },
    textureSpectral: { value: starColorGraph },
    spectralLookup: { value: 0.5 },
  };

  // Store uniforms on root for later updates
  root.haloUniforms = haloUniforms;
  root.coronaUniforms = coronaUniforms;

  const placeholderGeo = new THREE.SphereGeometry(7.35144e-8, 32, 16);
  const placeholderMat = new THREE.MeshStandardMaterial({
    color: 0xffeedd,
    roughness: 0.5,
    metalness: 0.0,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffeedd),
    emissiveIntensity: 0.8,
  });
  const placeholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
  placeholderMesh.name = "planetPlaceholder";
  root.add(placeholderMesh);

  // Create gyroscope for camera-facing glow elements
  const gyro = new Gyroscope();
  root.add(gyro);
  root.gyro = gyro;

  // Add halo effect
  const planetHalo = makePlanetHalo(haloUniforms);
  gyro.add(planetHalo);
  root.planetHalo = planetHalo;

  // Add glow/corona effect
  const planetGlow = makePlanetGlow(coronaUniforms);
  gyro.add(planetGlow);
  root.planetGlow = planetGlow;

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
    const modelName = baseScene.userData ? baseScene.userData.modelName : "";

    planetInstance.rotation.set(0, 0, 0);
    
    // Deep-copy materials to prevent polluting the cached base scene
    planetInstance.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => m.clone());
        } else {
          obj.material = obj.material.clone();
        }
      }
    });

    const meshesToRemove = [];
    planetInstance.traverse((obj) => {
      if (obj.isMesh) {
        if (!obj.geometry) {
          console.warn("[Planet] Mesh missing geometry:", obj.name);
        }
        obj.frustumCulled = false;
        obj.castShadow = true;
        obj.receiveShadow = true;

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
    const normalizeScale = targetSize / (maxDim || 1);
    const baseScaleMultiplier = 0.8;
    const finalNormScale = normalizeScale * baseScaleMultiplier;

    planetInstance.scale.set(finalNormScale, finalNormScale, finalNormScale);

    const center = box.getCenter(new THREE.Vector3());
    planetInstance.position.sub(center.multiplyScalar(finalNormScale));

    if (shouldAttachPlanetInternalLight(modelName)) {
      const lightConfig = getPlanetInternalLightConfig({
        position: { x: 0, y: 0, z: 0 },
      });
      const internalLight = createPlanetInternalLight(THREE, lightConfig);
      if (internalLight) {
        internalLight.name = "planetInternalLight";
        planetInstance.add(internalLight);
      }
    }

    this.add(planetInstance);
    this._planetMesh = planetInstance;
    this._baseScale = finalNormScale;

    if (this._currentScale !== undefined) {
      this.setScale(this._currentScale);
    }

    planetInstance.visible = this.visible;
  };

  root.pickRandomModel = function () {
    // Use cached models if available
    if (planetBaseScenes.length > 0) {
      const randomIndex = Math.floor(Math.random() * planetBaseScenes.length);
      this.setPlanetMesh(planetBaseScenes[randomIndex]);
      return;
    }

    // Otherwise load on demand
    const self = this;
    loadRandomModel().then((scene) => {
      if (scene) {
        self.setPlanetMesh(scene);
      }
    });
  };

  root.setModelForDomain = function (domain) {
    const modelPath = SUPERGIANT_MODELS[domain];
    if (!modelPath) {
      this.pickRandomModel();
      return;
    }

    const self = this;
    loadModelOnDemand(modelPath).then((scene) => {
      if (scene) {
        self.setPlanetMesh(scene);
      }
    });
  };

  // No eager loading - models will be loaded on-demand when pickRandomModel is called

  root._currentSpectralIndex = 0.5;
  root._currentScale = 1.0;
  root._rotationSpeed = 0.0005;

  root.setSpectralIndex = function (index) {
    this._currentSpectralIndex = index;

    // Constrain spectral value to 0-1 range
    const spectralValue = Math.max(0, Math.min(1, (index + 0.3) / 1.82));

    // Update halo and corona uniforms
    if (this.haloUniforms) {
      this.haloUniforms.spectralLookup.value = spectralValue;
    }
    if (this.coronaUniforms) {
      this.coronaUniforms.spectralLookup.value = spectralValue;
    }
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

    // Scale the gyro (halo and glow) proportionally
    if (this.gyro) {
      this.gyro.scale.set(scale, scale, scale);
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
    // Update shader time uniforms
    const shaderTiming = window.shaderTiming || 0;
    const rotateYAccumulate = window.rotateYAccumulate || 0;

    if (this.haloUniforms) {
      this.haloUniforms.time.value = shaderTiming + rotateYAccumulate;
    }

    // Rotation logic moved to inner mesh to persist across frames
    // because root.rotation is overwritten by main.js in animate()
    if (this._planetMesh) {
      this._planetMesh.rotation.y += this._rotationSpeed;

      if (this._planetMesh.visible !== this.visible) {
        this._planetMesh.visible = this.visible;
      }
    }

    // Sync gyro visibility with root
    if (this.gyro) {
      this.gyro.visible = this.visible;
    }
  };

  root.substars = [];

  root.visible = false;

  return root;
}

// Alias for compatibility with main.js expectation
export const makeStarModels = createPlanetModel;

window.preloadPlanetModel = preloadPlanetModel;
window.preloadAllModels = preloadAllModels;
window.loadRandomModel = loadRandomModel;
window.loadModelOnDemand = loadModelOnDemand;
window.createPlanetModel = createPlanetModel;
window.isPlanetModelLoaded = isPlanetModelLoaded;
window.makeStarModels = makeStarModels;

// Debug function - call from console: debugPlanetZFighting()
window.debugPlanetZFighting = function () {
  const cam = state.camera;
  const planetCam = window.planetCamera;
  const rend = state.renderer;
  const star = state.starModel;

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
