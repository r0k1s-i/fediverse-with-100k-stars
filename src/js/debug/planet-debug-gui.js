/**
 * Planet Debug GUI
 * 
 * Real-time adjustment of planet model materials and lighting.
 * Press 'G' to toggle the debug panel.
 */

import GUI from 'lil-gui';
import * as THREE from 'three';

let gui = null;
let isVisible = false;

export function initPlanetDebugGUI() {
  if (gui) return gui;
  
  gui = new GUI({ title: 'Planet Debug', width: 320 });
  gui.domElement.style.display = 'none';
  
  // Keyboard toggle
  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') {
      isVisible = !isVisible;
      gui.domElement.style.display = isVisible ? '' : 'none';
    }
  });
  
  setupRendererFolder();
  setupLightingFolder();
  setupMaterialFolder();
  setupCameraFolder();
  setupExportButton();
  
  console.log('[Debug] Planet GUI initialized. Press G to toggle.');
  return gui;
}

function setupLightingFolder() {
  const folder = gui.addFolder('Lighting');
  
  const lightParams = {
    directionalIntensity: 2.0,
    directionalX: 3,
    directionalY: 10,
    directionalZ: 5,
    ambientIntensity: 0.05,
    ambientColor: '#ffffff',
    spotlightIntensity: 1.0,
    spotlightAngle: 0.5,
  };
  
  folder.add(lightParams, 'directionalIntensity', 0, 10).onChange((v) => {
    const ps = window.planetScene;
    if (!ps) return;
    ps.traverse((obj) => {
      if (obj.isDirectionalLight && obj !== window.planetSpotlight) {
        obj.intensity = v;
      }
    });
  });
  
  folder.add(lightParams, 'directionalX', -20, 20).onChange(updateDirLightPos);
  folder.add(lightParams, 'directionalY', -20, 20).onChange(updateDirLightPos);
  folder.add(lightParams, 'directionalZ', -20, 20).onChange(updateDirLightPos);
  
  function updateDirLightPos() {
    const ps = window.planetScene;
    if (!ps) return;
    ps.traverse((obj) => {
      if (obj.isDirectionalLight && !obj.isSpotLight) {
        obj.position.set(lightParams.directionalX, lightParams.directionalY, lightParams.directionalZ);
      }
    });
  }
  
  folder.add(lightParams, 'ambientIntensity', 0, 2).onChange((v) => {
    const ps = window.planetScene;
    if (!ps) return;
    ps.traverse((obj) => {
      if (obj.isAmbientLight) {
        obj.intensity = v;
      }
    });
  });
  
  folder.addColor(lightParams, 'ambientColor').onChange((v) => {
    const ps = window.planetScene;
    if (!ps) return;
    ps.traverse((obj) => {
      if (obj.isAmbientLight) {
        obj.color.set(v);
      }
    });
  });
  
  folder.close();
}

function setupRendererFolder() {
  const folder = gui.addFolder('Renderer / HDR');
  
  const rendererParams = {
    toneMappingExposure: 0.35,
    toneMapping: 'ACESFilmicToneMapping',
    hasEnvMap: false,
    envMapIntensityGlobal: 1.0,
  };
  
  // Check current state
  const renderer = window.renderer;
  if (renderer) {
    rendererParams.toneMappingExposure = renderer.toneMappingExposure;
  }
  rendererParams.hasEnvMap = !!window.studioEnvMap;
  
  folder.add(rendererParams, 'toneMappingExposure', 0.1, 3.0).name('HDR Exposure').onChange((v) => {
    if (window.renderer) {
      window.renderer.toneMappingExposure = v;
    }
  });
  
  folder.add(rendererParams, 'toneMapping', [
    'NoToneMapping',
    'LinearToneMapping', 
    'ReinhardToneMapping',
    'CineonToneMapping',
    'ACESFilmicToneMapping',
    'AgXToneMapping',
    'NeutralToneMapping',
  ]).onChange((v) => {
    if (window.renderer && THREE[v] !== undefined) {
      window.renderer.toneMapping = THREE[v];
    }
  });
  
  folder.add(rendererParams, 'hasEnvMap').name('Env Map Loaded').listen().disable();
  
  folder.add(rendererParams, 'envMapIntensityGlobal', 0, 5).name('Env Map Intensity').onChange((v) => {
    applyToAllMeshes((m) => { 
      if ('envMapIntensity' in m) m.envMapIntensity = v; 
    });
  });
  
  // Add button to reload different HDR
  const hdrOptions = {
    reloadEnv: () => {
      console.log('[Debug] Current envMap:', window.studioEnvMap);
      console.log('[Debug] planetScene.environment:', window.planetScene?.environment);
    }
  };
  folder.add(hdrOptions, 'reloadEnv').name('🔍 Log Env Status');
  
  folder.close();
}

function applyToAllMeshes(fn) {
  const star = window.starModel;
  if (!star) {
    console.warn("[Debug] No starModel");
    return;
  }
  if (!star._planetMesh) {
    console.warn("[Debug] No _planetMesh on starModel");
    return;
  }
  let count = 0;
  star._planetMesh.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        fn(m);
        m.needsUpdate = true;
        count++;
      });
    }
  });
  console.log("[Debug] Applied to", count, "materials");
}

function setupMaterialFolder() {
  const folder = gui.addFolder('Material Overrides');
  
  const matParams = {
    metalness: 0.5,
    roughness: 0.5,
    envMapIntensity: 1.5,
    emissiveIntensity: 0,
    emissiveColor: '#000000',
    baseColor: '#808080',
    transparent: false,
    opacity: 1.0,
    wireframe: false,
  };
  
  folder.add(matParams, 'metalness', 0, 1).onChange((v) => {
    applyToAllMeshes((m) => { if ('metalness' in m) m.metalness = v; });
  });
  
  folder.add(matParams, 'roughness', 0, 1).onChange((v) => {
    applyToAllMeshes((m) => { if ('roughness' in m) m.roughness = v; });
  });
  
  folder.add(matParams, 'envMapIntensity', 0, 5).onChange((v) => {
    applyToAllMeshes((m) => { if ('envMapIntensity' in m) m.envMapIntensity = v; });
  });
  
  folder.add(matParams, 'emissiveIntensity', 0, 5).onChange((v) => {
    applyToAllMeshes((m) => { if ('emissiveIntensity' in m) m.emissiveIntensity = v; });
  });
  
  folder.addColor(matParams, 'emissiveColor').onChange((v) => {
    applyToAllMeshes((m) => { 
      if (m.emissive) m.emissive.set(v); 
    });
  });
  
  folder.addColor(matParams, 'baseColor').name('Base Color').onChange((v) => {
    applyToAllMeshes((m) => { 
      if (m.color) m.color.set(v); 
    });
  });
  
  folder.add(matParams, 'transparent').onChange((v) => {
    applyToAllMeshes((m) => { m.transparent = v; });
  });
  
  folder.add(matParams, 'opacity', 0, 1).onChange((v) => {
    applyToAllMeshes((m) => { m.opacity = v; });
  });
  
  folder.add(matParams, 'wireframe').onChange((v) => {
    applyToAllMeshes((m) => { m.wireframe = v; });
  });
  
  // Log all materials button
  const debugActions = {
    logMaterials: () => {
      const star = window.starModel;
      if (!star || !star._planetMesh) return;
      console.log('=== ALL MATERIALS ===');
      star._planetMesh.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          const m = obj.material;
          console.log(obj.name, {
            type: m.type,
            color: m.color?.getHexString(),
            metalness: m.metalness,
            roughness: m.roughness,
            envMap: !!m.envMap,
            envMapIntensity: m.envMapIntensity,
            transparent: m.transparent,
            opacity: m.opacity,
            visible: obj.visible,
          });
        }
      });
    },
    forceAllTransparent: () => {
      // Try multiple sources
      const sources = [];
      
      // Source 1: starModel._planetMesh
      const star = window.starModel;
      if (star && star._planetMesh) {
        sources.push({ name: 'starModel._planetMesh', obj: star._planetMesh });
      }
      
      // Source 2: localRoot children
      if (window.localRoot) {
        window.localRoot.traverse((obj) => {
          if (obj.isMesh) {
            sources.push({ name: 'localRoot: ' + obj.name, obj: obj });
          }
        });
      }
      
      // Source 3: planetScene
      if (window.planetScene) {
        window.planetScene.traverse((obj) => {
          if (obj.isMesh && obj.material) {
            const m = obj.material;
            m.transparent = true;
            m.opacity = 0.3;
            m.depthWrite = false;
            m.side = THREE.DoubleSide;
            m.needsUpdate = true;
          }
        });
      }
      
      console.log('[Debug] Sources found:', sources.map(s => s.name));
      console.log('[Debug] planetScene children:', window.planetScene?.children?.length);
      console.log('[Debug] Forced all materials to transparent (opacity=0.3)');
    },
    resetTransparency: () => {
      applyToAllMeshes((m) => {
        m.transparent = false;
        m.opacity = 1.0;
        m.depthWrite = true;
      });
      console.log('[Debug] Reset all materials to opaque');
    },
    hideAllMeshes: () => {
      let count = 0;
      if (window.planetScene) {
        window.planetScene.traverse((obj) => {
          if (obj.isMesh) {
            obj.visible = false;
            count++;
          }
        });
      }
      console.log('[Debug] Hidden ALL meshes:', count);
    },
    showAllMeshes: () => {
      let count = 0;
      if (window.planetScene) {
        window.planetScene.traverse((obj) => {
          if (obj.isMesh) {
            obj.visible = true;
            count++;
          }
        });
      }
      console.log('[Debug] Shown ALL meshes:', count);
    },
  };
  folder.add(debugActions, 'logMaterials').name('🔍 Log All Materials');
  folder.add(debugActions, 'forceAllTransparent').name('🔮 Force All Transparent');
  folder.add(debugActions, 'resetTransparency').name('⬜ Reset to Opaque');
  folder.add(debugActions, 'hideAllMeshes').name('👻 Hide ALL Meshes');
  folder.add(debugActions, 'showAllMeshes').name('👁️ Show ALL Meshes');
  
  folder.close();
}

function setupCameraFolder() {
  const folder = gui.addFolder('Planet Camera');
  
  const camParams = {
    distance: 3,
    fov: 45,
  };
  
  folder.add(camParams, 'distance', 0.5, 50).onChange((v) => {
    const pc = window.planetCamera;
    if (pc) pc.position.z = v;
  });
  
  folder.add(camParams, 'fov', 10, 120).onChange((v) => {
    const pc = window.planetCamera;
    if (pc) {
      pc.fov = v;
      pc.updateProjectionMatrix();
    }
  });
  
  folder.close();
}

function setupExportButton() {
  const exportParams = {
    exportConfig: () => {
      const config = gatherCurrentConfig();
      console.log('=== PLANET CONFIG ===');
      console.log(JSON.stringify(config, null, 2));
      console.log('=====================');
      
      // Copy to clipboard
      navigator.clipboard.writeText(JSON.stringify(config, null, 2))
        .then(() => console.log('Config copied to clipboard!'))
        .catch(() => console.log('Could not copy to clipboard'));
    }
  };
  
  gui.add(exportParams, 'exportConfig').name('📋 Export Config');
}

function gatherCurrentConfig() {
  const ps = window.planetScene;
  const pc = window.planetCamera;
  const star = window.starModel;
  
  const config = {
    camera: {
      distance: pc?.position.z || 3,
      fov: pc?.fov || 45,
    },
    lighting: {},
    material: {},
  };
  
  // Gather lighting
  if (ps) {
    ps.traverse((obj) => {
      if (obj.isDirectionalLight && !obj.isSpotLight) {
        config.lighting.directional = {
          intensity: obj.intensity,
          position: obj.position.toArray(),
          color: '#' + obj.color.getHexString(),
        };
      }
      if (obj.isAmbientLight) {
        config.lighting.ambient = {
          intensity: obj.intensity,
          color: '#' + obj.color.getHexString(),
        };
      }
    });
  }
  
  // Gather material from first mesh
  if (star && star._planetMesh) {
    star._planetMesh.traverse((obj) => {
      if (obj.isMesh && obj.material && !config.material.sample) {
        const m = obj.material;
        config.material.sample = {
          type: m.type,
          metalness: m.metalness,
          roughness: m.roughness,
          envMapIntensity: m.envMapIntensity,
          emissiveIntensity: m.emissiveIntensity,
          transparent: m.transparent,
          opacity: m.opacity,
        };
      }
    });
  }
  
  return config;
}

window.initPlanetDebugGUI = initPlanetDebugGUI;
