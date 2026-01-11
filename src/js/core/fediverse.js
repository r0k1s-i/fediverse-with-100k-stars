/**
 * Fediverse Instance Visualization
 * Replaces hipparcos.js star data with Fediverse instances
 *
 * Uses legacy Three.js r58 patterns for compatibility with existing codebase
 */

function loadFediverseData(dataFile, callback) {
  var xhr = new XMLHttpRequest();
  setLoadMessage("Fetching Fediverse data");
  xhr.addEventListener(
    "load",
    function (event) {
      var parsed = JSON.parse(xhr.responseText);
      var SCALE_FACTOR = 5;
      for (var i = 0; i < parsed.length; i++) {
        if (parsed[i].position) {
          parsed[i].position.x /= SCALE_FACTOR;
          parsed[i].position.y /= SCALE_FACTOR;
          parsed[i].position.z /= SCALE_FACTOR;
        }
      }
      if (callback) {
        setLoadMessage("Parsing instance data");
        callback(parsed);
      }
    },
    false,
  );
  xhr.open("GET", dataFile, true);
  xhr.send(null);
}

var fediverseTexture0 = THREE.ImageUtils.loadTexture("src/assets/textures/p_0.png");
var fediverseTexture1 = THREE.ImageUtils.loadTexture("src/assets/textures/p_2.png");
var fediverseHeatVisionTexture = THREE.ImageUtils.loadTexture(
  "src/assets/textures/sharppoint.png",
);
var instancePreviewTexture = THREE.ImageUtils.loadTexture(
  "src/assets/textures/star_preview.png",
  undefined,
  setLoadMessage("Focusing optics"),
);
var fediverseColorGraph = THREE.ImageUtils.loadTexture(
  "src/assets/textures/star_color_modified.png",
);

var instanceSunHaloTexture = THREE.ImageUtils.loadTexture(
  "src/assets/textures/sun_halo.png",
);
var instanceCoronaTexture = THREE.ImageUtils.loadTexture(
  "src/assets/textures/corona.png",
);

var MAJOR_INSTANCE_COLORS = {
  "mastodon.social": 0xffffff,
  "misskey.io": 0xffffff,
  "pixelfed.social": 0xffffff,
};

function isMajorInstance(domain) {
  return MAJOR_INSTANCE_COLORS.hasOwnProperty(domain);
}

function getMajorInstanceColor(domain) {
  return MAJOR_INSTANCE_COLORS[domain];
}

function createMajorInstancePreview(color) {
  var container = new THREE.Object3D();

  var haloMaterial = new THREE.MeshBasicMaterial({
    map: instanceSunHaloTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    color: color || 0xffffff,
  });
  var haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), haloMaterial);
  container.add(haloMesh);

  var coronaMaterial = new THREE.MeshBasicMaterial({
    map: instanceCoronaTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    color: color || 0xffffff,
  });
  var coronaMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    coronaMaterial,
  );
  container.add(coronaMesh);

  container.update = function () {
    var zoomFactor = camera.position.z;
    var opacity = constrain(Math.pow(zoomFactor * 0.002, 2), 0, 1);
    if (opacity < 0.1) opacity = 0.0;

    haloMaterial.opacity = opacity;
    coronaMaterial.opacity = opacity * 0.6;

    if (opacity <= 0.0) {
      this.visible = false;
    } else {
      this.visible = true;
    }

    var scale = constrain(Math.pow(zoomFactor * 0.001, 2), 0.1, 1.5);
    this.scale.setLength(scale);
  };

  return container;
}

var fediverseUniforms = {
  color: { type: "c", value: new THREE.Color(0xffffff) },
  texture0: { type: "t", value: fediverseTexture0 },
  texture1: { type: "t", value: fediverseTexture1 },
  heatVisionTexture: { type: "t", value: fediverseHeatVisionTexture },
  spectralLookup: { type: "t", value: fediverseColorGraph },
  idealDepth: { type: "f", value: 1.0 },
  blurPower: { type: "f", value: 1.0 },
  blurDivisor: { type: "f", value: 2.0 },
  sceneSize: { type: "f", value: 120.0 },
  cameraDistance: { type: "f", value: 800.0 },
  zoomSize: { type: "f", value: 1.0 },
  scale: { type: "f", value: 1.0 },
  brightnessScale: { type: "f", value: 1.0 },
  heatVision: { type: "f", value: 0.0 },
};

var fediverseAttributes = {
  size: { type: "f", value: [] },
  customColor: { type: "c", value: [] },
  colorIndex: { type: "f", value: [] },
  isVirtual: { type: "f", value: [] },
};

var fediverseInstances = [];
var fediverseMeshes = [];

/**
 * Generate virtual background particles for visual effect
 * These particles are non-interactive and randomly positioned each session
 */
function generateVirtualParticles(targetCount) {
  var virtualParticles = [];
  var realCount = fediverseInstances.length;
  var virtualCount = Math.max(0, targetCount - realCount);

  if (realCount === 0 || virtualCount === 0) {
    return virtualParticles;
  }

  var totalWeight = 0;
  var weights = [];
  for (var i = 0; i < realCount; i++) {
    var userCount = fediverseInstances[i].stats
      ? fediverseInstances[i].stats.user_count
      : 1;
    var weight = Math.log(userCount + 1) + 1;
    weights.push(weight);
    totalWeight += weight;
  }

  for (var i = 0; i < virtualCount; i++) {
    var r = Math.random() * totalWeight;
    var cumulative = 0;
    var parentIdx = 0;
    for (var j = 0; j < realCount; j++) {
      cumulative += weights[j];
      if (r <= cumulative) {
        parentIdx = j;
        break;
      }
    }

    var parent = fediverseInstances[parentIdx];
    var parentPos = parent.position;
    var parentUserCount = parent.stats ? parent.stats.user_count : 1;

    var spread = 50 + Math.log(parentUserCount + 1) * 30;

    var offsetX = (Math.random() - 0.5) * spread * 2;
    var offsetY = (Math.random() - 0.5) * spread * 2;
    var offsetZ = (Math.random() - 0.5) * spread * 0.5;

    var domainHash = 0;
    for (var k = 0; k < parent.domain.length; k++) {
      domainHash = (domainHash * 31 + parent.domain.charCodeAt(k)) % 1000;
    }
    var baseSpectral = 0.2 + (domainHash / 1000) * 0.6;
    var spectralVariation = (Math.random() - 0.5) * 0.15;

    virtualParticles.push({
      position: {
        x: parentPos.x + offsetX,
        y: parentPos.y + offsetY,
        z: parentPos.z + offsetZ,
      },
      size: 8 + Math.random() * 10,
      spectralLookup: Math.max(0.1, Math.min(0.9, baseSpectral + spectralVariation)),
      brightness: 0.5 + Math.random() * 0.4,
      isVirtual: true,
    });
  }

  return virtualParticles;
}

function generateFediverseInstances() {
  var container = new THREE.Object3D();
  var pGeo = new THREE.Geometry();
  var count = fediverseInstances.length;

  // Generate virtual particles to reach 100k total
  var TARGET_PARTICLE_COUNT = 100000;
  var virtualParticles = generateVirtualParticles(TARGET_PARTICLE_COUNT);

  var instancePreviews = new THREE.Object3D();
  container.add(instancePreviews);

  var instancePreviewMaterial = new THREE.MeshBasicMaterial({
    map: instancePreviewTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  var instancePreview = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    instancePreviewMaterial,
  );
  var pLineGeo = new THREE.Geometry();
  var MIN_USERS_FOR_LINE = 50000;

  // Add real instances
  for (var i = 0; i < count; i++) {
    var instance = fediverseInstances[i];

    var p = new THREE.Vector3(
      instance.position.x,
      instance.position.y,
      instance.position.z,
    );

    var userCount = instance.stats ? instance.stats.user_count : 1;
    p.size = Math.max(15.0, Math.log(userCount + 1) * 8);
    p.name = instance.name || instance.domain;
    p.instanceData = instance;

    // Use white color for normal mode (like HIPPARCOS stars)
    // The spectral lookup texture will provide subtle color tones
    var threeColor = new THREE.Color(0xffffff);

    // Use domain-based pseudo-random spectral lookup for variety in normal mode
    // This gives each instance a consistent but varied color tone
    var domainHash = 0;
    for (var j = 0; j < instance.domain.length; j++) {
      domainHash = (domainHash * 31 + instance.domain.charCodeAt(j)) % 1000;
    }

    p.spectralLookup = 0.2 + (domainHash / 1000) * 0.6;
    p.brightness = 1.0;
    p.isVirtual = false;

    pGeo.vertices.push(p);
    pGeo.colors.push(threeColor);

    if (userCount >= MIN_USERS_FOR_LINE) {
      pLineGeo.vertices.push(p.clone());
      var base = p.clone();
      base.z = 0;
      pLineGeo.vertices.push(base);
    }

    // Create mesh objects for ALL instances to make them clickable via raycasting
    // But only show HTML text labels for very large instances
    var MIN_USERS_FOR_HTML_LABEL = 999999999; // Effectively disable all HTML labels
    var showHTMLLabel = userCount >= MIN_USERS_FOR_HTML_LABEL;

    // Always create the mesh object for raycasting/clicking
    if (
      instance.positionType === "three_star_center" ||
      instance.positionType === "galaxy_center" ||
      userCount > 1000
    ) {
      // Only create meshes for instances with 1000+ users to reduce overhead

      var gyroInstance = new THREE.Gyroscope();
      gyroInstance.position.copy(p);

      if (isMajorInstance(instance.domain)) {
        var majorColor = getMajorInstanceColor(instance.domain);
        var majorPreview = createMajorInstancePreview(majorColor);
        gyroInstance.add(majorPreview);
      } else {
        var preview = instancePreview.clone();
        gyroInstance.add(preview);

        preview.update = function () {
          this.material.opacity = constrain(
            Math.pow(camera.position.z * 0.002, 2),
            0,
            1,
          );
          if (this.material.opacity < 0.1) this.material.opacity = 0.0;
          if (this.material.opacity <= 0.0) this.visible = false;
          else this.visible = true;
          this.scale.setLength(
            constrain(Math.pow(camera.position.z * 0.001, 2), 0, 1),
          );
        };
      }

      var g = new THREE.Gyroscope();
      container.add(g);
      g.name = instance.name || instance.domain;
      g.instanceData = instance;
      g.position.copy(p);
      g.scale.setLength(1.0);
      g.visible = true;

      // Only attach HTML label for very large instances
      if (showHTMLLabel) {
        attachLegacyMarker(instance.domain, g, 1.0, { min: 0, max: 50000 });
      }

      instancePreviews.add(gyroInstance);
      fediverseMeshes.push(g);
    }
  }

  for (var i = 0; i < virtualParticles.length; i++) {
    var vp = virtualParticles[i];

    var p = new THREE.Vector3(vp.position.x, vp.position.y, vp.position.z);
    p.size = vp.size;
    p.spectralLookup = vp.spectralLookup;
    p.brightness = vp.brightness;
    p.isVirtual = true;

    // Use white color for virtual particles too
    // Brightness will be controlled by spectralLookup and shader
    var vColor = new THREE.Color(0xffffff);

    pGeo.vertices.push(p);
    pGeo.colors.push(vColor);
  }

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: fediverseUniforms,
    attributes: fediverseAttributes,
    vertexShader: shaderList.datastars.vertex,
    fragmentShader: shaderList.datastars.fragment,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });

  container.heatVision = false;
  container.shaderMaterial = shaderMaterial;

  container.toggleHeatVision = function (desired) {
    if (desired !== undefined) container.heatVision = !desired;

    if (container.heatVision == false) {
      container.shaderMaterial.blending = THREE.NormalBlending;
      container.shaderMaterial.depthTest = true;
      container.shaderMaterial.depthWrite = true;
      container.shaderMaterial.transparent = false;
    } else {
      container.shaderMaterial.blending = THREE.AdditiveBlending;
      container.shaderMaterial.depthTest = false;
      container.shaderMaterial.depthWrite = false;
      container.shaderMaterial.transparent = true;
    }

    container.heatVision = !container.heatVision;

    if (container.heatVision) {
      $spectralGraph.addClass("heatvision").fadeIn();
      $iconNav.addClass("heatvision");
    } else {
      $spectralGraph.removeClass("heatvision").fadeOut();
      $iconNav.removeClass("heatvision");
    }
  };

  window.toggleHeatVision = container.toggleHeatVision;

  var pSystem = new THREE.ParticleSystem(pGeo, shaderMaterial);
  pSystem.dynamic = false;

  var values_size = fediverseAttributes.size.value;
  var values_color = fediverseAttributes.customColor.value;
  var values_spectral = fediverseAttributes.colorIndex.value;
  var values_isVirtual = fediverseAttributes.isVirtual.value;

  for (var v = 0; v < pGeo.vertices.length; v++) {
    values_size[v] = pGeo.vertices[v].size;
    values_color[v] = pGeo.colors[v];
    values_spectral[v] = pGeo.vertices[v].spectralLookup;
    values_isVirtual[v] = pGeo.vertices[v].isVirtual ? 1.0 : 0.0;
  }

  var lineMesh = new THREE.Line(
    pLineGeo,
    new THREE.LineBasicMaterial({
      color: 0x333333,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    }),
    THREE.LinePieces,
  );
  pSystem.add(lineMesh);

  var glowSpanTexture = THREE.ImageUtils.loadTexture(
    "src/assets/textures/glowspan.png",
  );
  var gridMaterial = new THREE.MeshBasicMaterial({
    map: glowSpanTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    wireframe: true,
    opacity: 0.6,
  });
  var gridPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000, 60, 60),
    gridMaterial,
  );
  gridPlane.material.map.wrapS = THREE.RepeatWrapping;
  gridPlane.material.map.wrapT = THREE.RepeatWrapping;
  gridPlane.material.map.repeat.set(8, 8);
  gridPlane.material.map.needsUpdate = true;
  gridPlane.material.map.onUpdate = function () {
    this.offset.y -= 0.0002;
    this.needsUpdate = true;
  };
  gridPlane.update = function () {
    if (camera.position.z < 1500) {
      this.material.opacity = constrain(
        (camera.position.z - 300.0) * 0.001,
        0,
        0.6,
      );
    } else {
      this.material.opacity += (0.0 - this.material.opacity) * 0.05;
    }
    if (this.material.opacity <= 0) this.visible = false;
    else this.visible = true;
  };
  pSystem.add(gridPlane);

  container.add(pSystem);

  container.update = function () {
    var blueshift = (camera.position.z + 5000.0) / 60000.0;
    blueshift = constrain(blueshift, 0.0, 0.2);

    var brightnessScale = constrain(10 / Math.sqrt(camera.position.z), 0, 1);

    if (container.heatVision) {
      fediverseUniforms.cameraDistance.value = 0.0;
      fediverseUniforms.brightnessScale.value = 1.0;
      fediverseUniforms.heatVision.value +=
        (1.0 - fediverseUniforms.heatVision.value) * 0.2;
    } else {
      fediverseUniforms.brightnessScale.value = brightnessScale;
      fediverseUniforms.heatVision.value +=
        (0.0 - fediverseUniforms.heatVision.value) * 0.2;
    }

    if (fediverseUniforms.heatVision.value < 0.01)
      fediverseUniforms.heatVision.value = 0.0;

    fediverseUniforms.cameraDistance.value = blueshift;
    fediverseUniforms.zoomSize.value = constrain(
      camera.position.z / 4000,
      0,
      1,
    );

    var areaOfWindow = window.innerWidth * window.innerHeight;
    fediverseUniforms.scale.value = Math.sqrt(areaOfWindow) * 1.5;

    fediverseUniforms.sceneSize.value = 10000;
  };

  lineMesh.update = function () {
    if (camera.position.z < 1500) {
      this.material.opacity = constrain(
        (camera.position.z - 400.0) * 0.002,
        0,
        1,
      );
    } else {
      this.material.opacity += (0.0 - this.material.opacity) * 0.1;
    }

    if (camera.position.z < 250) this.visible = false;
    else this.visible = true;
  };

  return container;
}

function getInstanceByDomain(domain) {
  for (var i = 0; i < fediverseInstances.length; i++) {
    if (fediverseInstances[i].domain === domain) {
      return fediverseInstances[i];
    }
  }
  return null;
}

function getSoftwareColor(softwareName) {
  var colors = {
    Mastodon: "#6364FF",
    Misskey: "#86b300",
    Pixelfed: "#E15C81",
    Lemmy: "#00BC8C",
    PeerTube: "#F1680D",
    Pleroma: "#FBA457",
    Akkoma: "#9B59B6",
    Friendica: "#FFA500",
    Diaspora: "#2E3436",
    WriteFreely: "#00A86B",
  };
  return colors[softwareName] || "#888888";
}
