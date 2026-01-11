/**
 * Fediverse Software Visualization
 * Replaces the traditional solar system with Fediverse software ecosystem
 * 
 * Center: Triangle of three major platforms (Mastodon, Misskey, Pixelfed)
 * Concentric circles: 8 other major software platforms
 */

// Top 8 software platforms (excluding Mastodon, Misskey, Pixelfed)
var FEDIVERSE_SOFTWARE_RINGS = [
  { name: "Lemmy", instances: 312, radius: 0.00008 },
  { name: "PeerTube", instances: 293, radius: 0.00016 },
  { name: "Pleroma", instances: 128, radius: 0.00024 },
  { name: "WordPress", instances: 124, radius: 0.00032 },
  { name: "Sharkey", instances: 118, radius: 0.00040 },
  { name: "Mobilizon", instances: 80, radius: 0.00048 },
  { name: "Akkoma", instances: 67, radius: 0.00056 },
  { name: "Gancio", instances: 57, radius: 0.00064 },
];

// Three major platforms forming the central triangle
var FEDIVERSE_MAJOR_SOFTWARE = [
  { name: "Mastodon", instances: 3226, angle: 90 },   // Top
  { name: "Misskey", instances: 695, angle: 210 },    // Bottom-left
  { name: "Pixelfed", instances: 202, angle: 330 },   // Bottom-right
];

// Software brand colors
var SOFTWARE_COLORS = {
  "Mastodon": 0x6364FF,
  "Misskey": 0x96d04a,
  "Pixelfed": 0xE94C89,
  "Lemmy": 0x00BC8C,
  "PeerTube": 0xF1680D,
  "Pleroma": 0xFBA457,
  "WordPress": 0x21759B,
  "Sharkey": 0x7BC8A4,
  "Mobilizon": 0x5F50A0,
  "Akkoma": 0x6364FF,
  "Gancio": 0xE53935,
};

function getSoftwareBrandColor(name) {
  return SOFTWARE_COLORS[name] || 0xffffff;
}

/**
 * Create a software ring (concentric circle) with label
 */
function createSoftwareRing(radius, color, softwareName, instanceCount) {
  var resolution = 180;
  var twoPI = Math.PI * 2;
  var angPerRes = twoPI / resolution;
  var verts = [];
  
  for (var i = 0; i < twoPI; i += angPerRes) {
    var x = Math.cos(i) * radius;
    var y = Math.sin(i) * radius;
    var v = new THREE.Vector3(x, y, 0);
    verts.push(v);
  }

  var geometry = new THREE.Geometry();
  geometry.vertices = verts;

  var areaOfWindow = window.innerWidth * window.innerHeight;
  var pointSize = 0.000004 * areaOfWindow;

  var particleMaterial = new THREE.ParticleBasicMaterial({
    color: color,
    size: pointSize,
    sizeAttenuation: false,
    map: guidePointTexture,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });

  var mesh = new THREE.ParticleSystem(geometry, particleMaterial);

  mesh.update = function () {
    if (camera.position.z < 2.0) {
      this.visible = false;
    } else if (camera.position.z < 800) {
      this.visible = true;
    } else {
      this.visible = false;
    }
  };

  mesh.rotation.x = Math.PI / 2;

  // Add label marker for the software name
  var labelPosition = new THREE.Object3D();
  labelPosition.position.x = radius;
  labelPosition.position.y = 0;
  labelPosition.position.z = 0;
  mesh.add(labelPosition);

  var labelText = softwareName + " (" + instanceCount + ")";
  attachLegacyMarker(labelText, labelPosition, 1.0, { min: 3.0, max: 20.0 });

  return mesh;
}

/**
 * Create the central triangle with three major software platforms
 */
function createCentralTriangle(triangleRadius) {
  var container = new THREE.Object3D();

  // Create triangle connecting lines
  var lineGeometry = new THREE.Geometry();
  var positions = [];

  FEDIVERSE_MAJOR_SOFTWARE.forEach(function (software) {
    var angleRad = (software.angle * Math.PI) / 180;
    var x = Math.cos(angleRad) * triangleRadius;
    var y = Math.sin(angleRad) * triangleRadius;
    positions.push(new THREE.Vector3(x, 0, y));
  });

  // Close the triangle
  lineGeometry.vertices.push(positions[0]);
  lineGeometry.vertices.push(positions[1]);
  lineGeometry.vertices.push(positions[1]);
  lineGeometry.vertices.push(positions[2]);
  lineGeometry.vertices.push(positions[2]);
  lineGeometry.vertices.push(positions[0]);

  var lineMaterial = new THREE.LineBasicMaterial({
    color: 0x666666,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    linewidth: 2,
  });

  var triangleLines = new THREE.Line(lineGeometry, lineMaterial, THREE.LinePieces);
  container.add(triangleLines);

  // Add markers for each major software at triangle vertices
  FEDIVERSE_MAJOR_SOFTWARE.forEach(function (software) {
    var angleRad = (software.angle * Math.PI) / 180;
    var x = Math.cos(angleRad) * triangleRadius;
    var y = Math.sin(angleRad) * triangleRadius;

    var marker = new THREE.Object3D();
    marker.position.set(x, 0, y);
    container.add(marker);

    var labelText = software.name + " (" + software.instances + ")";
    attachLegacyMarker(labelText, marker, 1.0, { min: 2.0, max: 15.0 });

    // Add a small glowing sphere at each vertex
    var sphereGeometry = new THREE.SphereGeometry(triangleRadius * 0.1, 16, 8);
    var sphereMaterial = new THREE.MeshBasicMaterial({
      color: getSoftwareBrandColor(software.name),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(x, 0, y);
    container.add(sphere);
  });

  // Visibility control based on zoom level
  container.update = function () {
    if (camera.position.z < 1.5) {
      this.visible = false;
    } else if (camera.position.z < 100) {
      this.visible = true;
    } else {
      this.visible = false;
    }
  };

  return container;
}

/**
 * Create the inner circle connecting the three major platforms
 */
function createInnerCircle(radius) {
  var resolution = 60;
  var twoPI = Math.PI * 2;
  var angPerRes = twoPI / resolution;
  var verts = [];

  for (var i = 0; i < twoPI; i += angPerRes) {
    var x = Math.cos(i) * radius;
    var y = Math.sin(i) * radius;
    var v = new THREE.Vector3(x, y, 0);
    verts.push(v);
  }

  var geometry = new THREE.Geometry();
  geometry.vertices = verts;

  var areaOfWindow = window.innerWidth * window.innerHeight;
  var pointSize = 0.000003 * areaOfWindow;

  var particleMaterial = new THREE.ParticleBasicMaterial({
    color: 0xaaaaaa,
    size: pointSize,
    sizeAttenuation: false,
    map: guidePointTexture,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });

  var mesh = new THREE.ParticleSystem(geometry, particleMaterial);
  mesh.rotation.x = Math.PI / 2;

  mesh.update = function () {
    if (camera.position.z < 1.5) {
      this.visible = false;
    } else if (camera.position.z < 100) {
      this.visible = true;
    } else {
      this.visible = false;
    }
  };

  return mesh;
}

/**
 * Main function to create the Fediverse software ecosystem visualization
 * Replaces makeSolarSystem()
 */
function makeFediverseSystem() {
  var fediverseSystem = new THREE.Object3D();

  // Central triangle radius (in light years, very small)
  var triangleRadius = 0.00003;

  // Create the central triangle with three major platforms
  var centralTriangle = createCentralTriangle(triangleRadius);
  fediverseSystem.add(centralTriangle);

  // Create inner circle around the triangle
  var innerCircle = createInnerCircle(triangleRadius * 1.2);
  fediverseSystem.add(innerCircle);

  // Create 8 concentric rings for other software platforms
  FEDIVERSE_SOFTWARE_RINGS.forEach(function (software) {
    var ring = createSoftwareRing(
      software.radius,
      getSoftwareBrandColor(software.name),
      software.name,
      software.instances
    );
    fediverseSystem.add(ring);
  });

  // Add distance measurement (1 light year reference)
  var measurement = createDistanceMeasurement(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0)
  );
  measurement.position.y = 0.08;
  measurement.update = function () {
    if (camera.position.z > 120 && camera.position.z < 400) {
      this.visible = true;
    } else {
      this.visible = false;
    }
  };
  measurement.visible = true;

  var sub = new THREE.Object3D();
  sub.position.x = 0.5;
  sub.position.y = 0.08;
  measurement.add(sub);
  attachLegacyMarker("One light year.", sub, 1.0, { min: 120, max: 400 });
  fediverseSystem.add(measurement);

  fediverseSystem.dynamic = true;

  return fediverseSystem;
}
