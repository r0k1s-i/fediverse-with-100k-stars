
function loadStarData(dataFile, callback) {
  var xhr = new XMLHttpRequest();
  setLoadMessage("Fetching stellar data");
  xhr.addEventListener(
    "load",
    function (event) {
      var parsed = JSON.parse(xhr.responseText);
      if (callback) {
        setLoadMessage("Parsing stellar data");
        callback(parsed);
      }
    },
    false,
  );
  xhr.open("GET", dataFile, true);
  xhr.send(null);
}

var textureLoader = new THREE.TextureLoader();

var datastarTexture0 = textureLoader.load("src/assets/textures/p_0.png");
var datastarTexture1 = textureLoader.load("src/assets/textures/p_2.png");
var datastarHeatVisionTexture = textureLoader.load(
  "src/assets/textures/sharppoint.png",
);

var starPreviewTexture = textureLoader.load(
  "src/assets/textures/star_preview.png",
  undefined,
  setLoadMessage("Focusing optics"),
);
var starColorGraph = textureLoader.load(
  "src/assets/textures/star_color_hsl.png",
);

var datastarUniforms = {
  color: { value: new THREE.Color(0xffffff) },
  texture0: { value: datastarTexture0 },
  texture1: { value: datastarTexture1 },
  heatVisionTexture: { value: datastarHeatVisionTexture },
  spectralLookup: { value: starColorGraph },
  idealDepth: { value: 1.0 },
  blurPower: { value: 1.0 },
  blurDivisor: { value: 2.0 },
  sceneSize: { value: 120.0 },
  cameraDistance: { value: 800.0 },
  zoomSize: { value: 1.0 },
  scale: { value: 1.0 },
  brightnessScale: { value: 1.0 },
  heatVision: { value: 0.0 },
};

function generateHipparcosStars() {
  var container = new THREE.Object3D();

  var count = starData.length;
  var geometry = new THREE.BufferGeometry();
  
  var positions = new Float32Array(count * 3);
  var colors = new Float32Array(count * 3);
  var sizes = new Float32Array(count);
  var colorIndexes = new Float32Array(count);

  var starPreviews = new THREE.Object3D();
  container.add(starPreviews);

  var starPreviewMaterial = new THREE.MeshBasicMaterial({
    map: starPreviewTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  var starPreview = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    starPreviewMaterial,
  );

  var linePositions = [];
  var namedStars = [];

  for (var i = 0; i < count; i++) {
    var star = starData[i];

    var distance = star.d * 3.26156;

    if (distance >= 10000000) {
      star.position = new THREE.Vector3();
      continue;
    }

    if (i == 0) {
      distance = 0;
    }

    var ra = star.ra;
    var dec = star.dec;

    var phi = ((ra + 90) * 15 * Math.PI) / 180;
    var theta = (dec * Math.PI) / 180;
    var rho = distance;
    var rvect = rho * Math.cos(theta);
    var x = rvect * Math.cos(phi);
    var y = rvect * Math.sin(phi);
    var z = rho * Math.sin(theta);

    var p = new THREE.Vector3(x, y, z);

    p.applyEuler(new THREE.Euler(Math.PI / 2, Math.PI, -Math.PI / 2));

    x = p.x;
    y = p.y;
    z = p.z;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    var size = 20.0;
    var name = star.name;
    var spectralIndex = star.c;

    if (star.c <= -1) star.c = 0;

    var spectralLookup = map(star.c, -0.3, 1.52, 0, 1);

    if (i == 0) size = 0;
    
    sizes[i] = size;
    colorIndexes[i] = spectralLookup;
    
    colors[i * 3] = 1.0;
    colors[i * 3 + 1] = 1.0;
    colors[i * 3 + 2] = 1.0;

    if (name && name.length > 0) {
        linePositions.push(x, y, z);
        linePositions.push(x, 0, z);

        var preview = starPreview.clone();
        var gyroStar = new THREE.Gyroscope();
        gyroStar.position.set(x, y, z);
        gyroStar.add(preview);

        preview.update = function () {
            this.material.opacity = constrain(
              Math.pow(camera.position.z * 0.002, 2),
              0,
              1,
            );
            if (this.material.opacity < 0.1) this.material.opacity = 0.0;
            if (this.material <= 0.0) this.visibile = false;
            else this.visible = true;
            this.scale.setLength(
              constrain(Math.pow(camera.position.z * 0.001, 2), 0, 1),
            );
        };

        var g = new THREE.Gyroscope();
        container.add(g);

        g.name = name;
        g.spectralIndex = spectralIndex;
        g.position.set(x, y, z);
        g.scale.setLength(0.2);
        attachMarker(g);

        starPreviews.add(gyroStar);
        
        namedStars.push({ x: x, y: y, z: z });
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('colorIndex', new THREE.BufferAttribute(colorIndexes, 1));

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: datastarUniforms,
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

  var pSystem = new THREE.Points(geometry, shaderMaterial);

  var lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

  var lineMesh = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: 0x333333,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    })
  );
  pSystem.add(lineMesh);

  var degCounter = 12;
  var degRadius = 600;
  for (var i = 0; i < degCounter; i++) {
    var degrees = (i / degCounter) * 360;
    var zerodeg = new THREE.Gyroscope();
    zerodeg.scale.setLength(0.8);
    var angle = (i / degCounter) * Math.TWO_PI;
    var x = Math.cos(angle) * degRadius;
    var y = Math.sin(angle) * degRadius;
    zerodeg.position.x = x;
    zerodeg.position.z = -y;
    zerodeg.name = degrees + "°";
    attachMarker(zerodeg, 1);
    container.add(zerodeg);
  }

  var starBaseTexture = textureLoader.load(
    "src/assets/textures/starbase.png",
  );
  var starBaseMaterial = new THREE.MeshBasicMaterial({
    map: starBaseTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  var starBaseGeometry = new THREE.PlaneGeometry(10, 10);
  
  var starBases = new THREE.InstancedMesh(starBaseGeometry, starBaseMaterial, namedStars.length);
  var dummy = new THREE.Object3D();
  
  for (var i = 0; i < namedStars.length; i++) {
      var ns = namedStars[i];
      dummy.position.set(ns.x, 0, ns.z); 
      
      dummy.rotation.x = -Math.PI / 2;
      
      dummy.updateMatrix();
      starBases.setMatrixAt(i, dummy.matrix);
  }
  
  starBases.update = function () {
    this.material.opacity = constrain(
      (camera.position.z - 400.0) * 0.002,
      0,
      1,
    );
    if (this.material.opacity <= 0) this.visible = false;
    else this.visible = true;
  };
  pSystem.add(starBases);

  container.add(pSystem);

  container.update = function () {
    var blueshift = (camera.position.z + 5000.0) / 60000.0;
    blueshift = constrain(blueshift, 0.0, 0.2);

    var brightnessScale = constrain(10 / Math.sqrt(camera.position.z), 0, 1);

    if (container.heatVision) {
      datastarUniforms.cameraDistance.value = 0.0;
      datastarUniforms.brightnessScale.value = 1.0;
      datastarUniforms.heatVision.value +=
        (1.0 - datastarUniforms.heatVision.value) * 0.2;
    } else {
      datastarUniforms.brightnessScale.value = brightnessScale;
      datastarUniforms.heatVision.value +=
        (0.0 - datastarUniforms.heatVision.value) * 0.2;
    }

    if (datastarUniforms.heatVision.value < 0.01)
      datastarUniforms.heatVision.value = 0.0;

    datastarUniforms.cameraDistance.value = blueshift;
    datastarUniforms.zoomSize.value = constrain(camera.position.z / 4000, 0, 1);

    var areaOfWindow = window.innerWidth * window.innerHeight;
    datastarUniforms.scale.value = Math.sqrt(areaOfWindow) * 1.5;

    if (camera.position.z < 1500) {
    } else {
    }

    datastarUniforms.sceneSize.value = 10000;
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
