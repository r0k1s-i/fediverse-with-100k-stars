# Coordinate Systems and Transformation Hierarchy

> **Purpose**: Comprehensive documentation of all coordinate systems, transformation hierarchies, and spatial conventions used in the 100k Star Challenge project.
>
> **Related Postmortems**: INC-002, INC-003, INC-009

---

## 📐 Three.js Global Coordinate System

The project uses Three.js's standard **right-handed coordinate system**:

```
       Y (Up)
       |
       |
       |_____ X (Right)
      /
     /
    Z (Toward Camera/Observer)
```

### Axis Conventions

| Axis | Direction | Positive | Negative |
|------|-----------|----------|----------|
| **X** | Horizontal | Right → | ← Left |
| **Y** | Vertical | Up ↑ | ↓ Down |
| **Z** | Depth | Toward observer ⊙ | Away from observer ⊗ |

### Rotation Conventions (Euler Angles)

Three.js uses **intrinsic rotations** with **XYZ order**:

```javascript
rotation.x  // Pitch (俯仰) - rotation around X axis
rotation.y  // Yaw (偏航) - rotation around Y axis  
rotation.z  // Roll (翻滚) - rotation around Z axis
```

**Important**: Positive rotation follows the **right-hand rule**:
- Point thumb in positive axis direction
- Fingers curl in positive rotation direction

---

## 🌌 Scene Graph Hierarchy

### Complete Hierarchy

```
Scene (Root)
├── AmbientLight
├── Camera (PerspectiveCamera)
└── rotating (THREE.Object3D)
    └── galacticCentering (THREE.Object3D)
        └── translating (THREE.Object3D)
            ├── starModel (Fediverse planet model)
            ├── pSystem (Fediverse instances - Points)
            ├── pGalacticSystem (Hipparcos stars - Points)
            │   └── pDustSystem (Dust particles)
            └── fediverseSystem (Supergiant stars + labels)
                ├── Betelgeuse (mastodon.social)
                ├── Antares (mstdn.jp)  
                └── VV Cephei A (mastodon.social supercluster)
```

### Transformation Layers

#### 1. **rotating** - Global Scene Rotation
```javascript
// Purpose: Auto-rotate entire scene for cinematic effect
// Controlled by: Mouse drag, auto-rotate mode
rotating.rotation.x = rotateX;  // Typically Math.PI * 0.05
rotating.rotation.y = rotateY;  // Animated, starts at Math.PI / 2
```

**Affected by**:
- Auto-rotate mode (`window.initialAutoRotate`)
- Mouse drag (`window.dragging`)
- Rotation velocity (`rotateVX`, `rotateVY`)

#### 2. **galacticCentering** - Galactic Coordinate Alignment
```javascript
// Purpose: Align galaxy coordinate system
// Currently: Identity transform (no rotation/translation)
galacticCentering.position.set(0, 0, 0);
galacticCentering.rotation.set(0, 0, 0);
```

**Note**: Reserved for future galactic coordinate transformations.

#### 3. **translating** - Camera Panning
```javascript
// Purpose: Pan camera to focus on specific stars/instances
// Position: Animated toward targetPosition
translating.position.x  // Horizontal pan
translating.position.y  // Vertical pan  
translating.position.z  // Depth pan (rarely used)

translating.targetPosition = new THREE.Vector3(x, y, z);
translating.update();  // Lerps position toward target
```

**Critical**: This is the **panning mechanism**, NOT camera movement!
- Camera remains stationary in `rotating` space
- All child objects move relative to camera

**Related Issue**: INC-009 - Raycast transforms must account for this

---

## 🌟 Coordinate System Details

### 1. Hipparcos Star System

**Purpose**: Render ~120,000 real stars based on Hipparcos catalog

**Coordinate Range**: 
- X: ~[-5000, 5000] parsecs
- Y: ~[-5000, 5000] parsecs
- Z: ~[-5000, 5000] parsecs

**Unit**: 1 Three.js unit = 1 parsec (~3.26 light-years)

**Data Source**: `data/hygdata_v3.csv`

**Position Calculation**:
```javascript
// Cartesian conversion from spherical coordinates
const x = distance * Math.cos(dec) * Math.cos(ra);
const y = distance * Math.sin(dec);
const z = distance * Math.cos(dec) * Math.sin(ra);
```

**Special Points**:
- Sun (Sol): `(0, 0, 0)` - Coordinate origin
- Sirius: `(-2.64, -1.21, -7.91)` - Brightest star
- Betelgeuse: Rendered as Fediverse supergiant at `(131, -71, 114)`

**Parent**: `translating`

---

### 2. Fediverse Instance System

**Purpose**: Visualize Fediverse instances as "stars"

**Original Coordinate Range**: 
- X, Y, Z: ~[-50, 50] (before scaling)

**Scaled Coordinate Range** (⚠️ Critical):
```javascript
const FEDIVERSE_COORD_SCALE = 100;  // Applied in INC-009 fix

// Actual positions
const x = instance.x * FEDIVERSE_COORD_SCALE;  // ~[-5000, 5000]
const y = instance.y * FEDIVERSE_COORD_SCALE;  // ~[-5000, 5000]
const z = instance.z * FEDIVERSE_COORD_SCALE;  // ~[-5000, 5000]
```

**Why Scaling?**: 
- Match Hipparcos coordinate range for consistent raycasting
- See Postmortem INC-009 for details

**Unit**: 1 Three.js unit ≈ abstract "network distance"

**Data Source**: `data/fediverse_final.json`

**Position Calculation**:
```javascript
// UMAP 3D projection + PCA transformation
// Details in data processing pipeline
```

**Special Instances**:
- mastodon.social: Largest, positioned as "Betelgeuse"
- mstdn.jp: Second largest, positioned as "Antares"
- Matrix of smaller instances distributed in 3D space

**Parent**: `translating`

---

### 3. Fediverse Supergiant System

**Purpose**: Three giant stars representing largest Fediverse instances

**Fixed Positions** (Equilateral Triangle):
```javascript
const SUPERGIANT_POSITIONS = {
  betelgeuse: {  // mastodon.social
    x: 0,
    y: 500 * Math.sqrt(3) / 3,  // ~288.67
    z: 0
  },
  antares: {  // mstdn.jp
    x: -250,
    y: -500 * Math.sqrt(3) / 6,  // ~-144.34
    z: 0
  },
  vvCepheiA: {  // Supercluster
    x: 250,
    y: -500 * Math.sqrt(3) / 6,  // ~-144.34
    z: 0
  }
};
```

**Geometry**: Perfect equilateral triangle
- Side length: 500 units
- Centered at origin
- All Z = 0 (XY plane)

**Visibility**: 
- Only shown when in "Fediverse Center" mode
- Hidden during normal Hipparcos browsing

**Parent**: `translating.fediverseSystem`

---

### 4. Grid Plane System

**Purpose**: Visual reference grid for Grid View mode

**Plane Orientation**: 
```javascript
// XZ horizontal plane (like a floor)
gridPlane.rotation.x = -Math.PI / 2;  // -90° around X
gridPlane.position.y = 0;
gridPlane.position.z = 0;

// Normal vector points UP (+Y)
```

**Size**: 10,000 × 10,000 units

**Visibility Range**:
```javascript
const GRID_VISIBLE_MIN_Z = 1500;
const GRID_VISIBLE_MAX_Z = 1900;

// Grid visible when:
camera.position.z > GRID_VISIBLE_MIN_Z && 
camera.position.z < GRID_VISIBLE_MAX_Z
```

**Grid View Camera**:
```javascript
const GRID_VIEW_CAMERA = {
  position: { x: 0, y: 0, z: 1800 },  // Within visible range
  rotation: { x: -Math.PI/3, y: 0, z: 0 }  // -60° bird's-eye view
};
```

**Parent**: `scene` (directly, not under `translating`)

---

## 📷 Camera System

### Camera Configuration

```javascript
camera = new THREE.PerspectiveCamera(
  30,                    // FOV (degrees)
  width / height,        // Aspect ratio
  0.5,                   // Near clipping plane
  10000000              // Far clipping plane (10 million units!)
);

camera.position.set(0, 0, 2500);  // Initial position
```

### Camera Zoom Levels

| Zoom Level | Z Position | Description | Visible Elements |
|------------|-----------|-------------|------------------|
| **0-500** | 0-500 | Close-up | Planet models, individual instances |
| **500-1400** | 500-1400 | Normal browsing | Fediverse instances, Hipparcos stars |
| **1500-1900** | 1500-1900 | Grid View range | Grid plane visible |
| **2000-2500** | 2000-2500 | Initial/Default | Full scene overview |
| **2500-5000** | 2500-5000 | Far view | Galaxy overview |
| **5000+** | 5000+ | Extreme distance | Galactic scale |

### Zoom Constraints

```javascript
const ZOOM_LIMITS = {
  min: 0.5,          // Closest zoom (inside star)
  max: 50000,        // Farthest zoom (galaxy overview)
  initial: 2500,     // Starting position
  gridView: 1800     // Grid view target
};
```

---

## 🎯 Interaction Coordinate Systems

### Raycasting Coordinate System

**Critical Concept**: Raycasting must account for ALL parent transformations.

#### Problem (INC-009)

```javascript
// ❌ WRONG: Ray in world space, objects in local space
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);
const intersects = raycaster.intersectObject(pSystem);  // FAILS!
```

**Why it fails**:
- `pSystem` is child of `translating`
- `translating.position` is not at origin when panned
- Ray tests in world space, positions in local space

#### Solution

```javascript
// ✅ CORRECT: Transform ray to local coordinates
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);

// Get inverse of translating's transform matrix
const invMatrix = new THREE.Matrix4();
invMatrix.copy(translating.matrix).invert();

// Transform ray to local space
raycaster.ray.applyMatrix4(invMatrix);

// Now raycasting works correctly
const intersects = raycaster.intersectObject(pSystem);
```

### Interaction Threshold Scaling

**Problem**: Fixed threshold doesn't scale with zoom level.

```javascript
// ❌ BAD: Fixed threshold
const threshold = 50;  // Too small at distance, too large up close

// ✅ GOOD: Dynamic threshold
const cameraDistance = camera.position.length();
const threshold = cameraDistance < 500 ? 10 : 50;

// ✅ BETTER: Screen-space threshold
const screenThreshold = 10;  // pixels
const worldThreshold = screenThreshold * cameraDistance / fov;
```

**Reference**: Postmortem INC-009

---

## 🔢 Important Constants

### Camera Positions

```javascript
// src/js/core/main.js
const CAMERA_INITIAL_Z = 2500;        // Starting position
const CAMERA_GRID_VIEW_Z = 1800;      // Grid view target

// src/js/core/spacehelpers.js  
const GRID_VIEW_CAMERA = {
  targetZ: 1800,
  rotateX: -Math.PI / 3,              // -60° bird's-eye
  rotateY: 0
};
```

### Visibility Ranges

```javascript
// Grid visibility
const GRID_VISIBLE_MIN_Z = 1500;
const GRID_VISIBLE_MAX_Z = 1900;

// Marker visibility
const MARKER_THRESHOLD = {
  min: 200,
  max: 45000
};

// Fediverse center detection
const FEDIVERSE_CENTER_THRESHOLD = 100;  // Distance from origin
```

### Coordinate Scaling

```javascript
// Fediverse coordinate scaling (INC-009 fix)
const FEDIVERSE_COORD_SCALE = 100;

// Applied to all Fediverse instance positions
position.x = instance.x * FEDIVERSE_COORD_SCALE;
position.y = instance.y * FEDIVERSE_COORD_SCALE;
position.z = instance.z * FEDIVERSE_COORD_SCALE;
```

---

## 🐛 Common Pitfalls and Solutions

### 1. Forgetting Coordinate Scaling

**Problem**: Fediverse instances not clickable at any zoom level.

**Cause**: Coordinates in different ranges (Fediverse ~50, Hipparcos ~5000).

**Solution**: Apply `FEDIVERSE_COORD_SCALE = 100`.

**Reference**: INC-009

---

### 2. Raycasting with Transformed Objects

**Problem**: Raycasting fails when `translating.position` is not at origin.

**Cause**: Ray in world space, object positions in local space.

**Solution**: Transform ray to local coordinates:
```javascript
const invMatrix = translating.matrix.clone().invert();
raycaster.ray.applyMatrix4(invMatrix);
```

**Reference**: INC-009

---

### 3. Grid Plane Orientation

**Problem**: Grid appears as vertical wall instead of horizontal floor.

**Cause**: PlaneGeometry defaults to XY plane (vertical in 3D).

**Solution**: Rotate -90° around X axis:
```javascript
gridPlane.rotation.x = -Math.PI / 2;
```

**Reference**: INC-002

---

### 4. Nested Object Scaling

**Problem**: Scaling parent doesn't affect child's local scale.

**Cause**: Confusion between world scale and local scale.

**Solution**: Scale both parent and child independently:
```javascript
sun.scale.set(5, 5, 5);     // Scale star
gyro.scale.set(5, 5, 5);    // Scale halo separately
```

**Reference**: INC-003

---

### 5. Camera Position vs. Translating Position

**Problem**: Treating camera movement as panning.

**Reality**: 
- Camera stays at `(0, 0, camera.position.z)`
- Scene pans via `translating.position`

**Correct Mental Model**:
```
User clicks star at (100, 200, 300)
→ translating.targetPosition = (-100, -200, -300)
→ Star moves to center, camera doesn't move (in rotating space)
```

---

## 🧪 Debugging Coordinate Systems

### Visual Debugging Tools

```javascript
// Toggle with 'D' key
import { initDebugTools } from './utils/debug-tools.js';
const debugTools = initDebugTools(scene, camera, renderer);

// Show coordinate axes (R=X, G=Y, B=Z)
debugTools.settings.helpers.showAxes = true;

// Show grid on XZ plane
debugTools.settings.helpers.showGrid = true;

// Visualize raycast
debugTools.visualizeRaycast(origin, direction, distance);

// Show interaction threshold
debugTools.settings.helpers.showThreshold = true;
debugTools.moveThresholdTo(targetPosition);
```

### Console Commands

```javascript
// Log current camera state (Press 'C')
console.log({
  position: camera.position,
  rotation: camera.rotation
});

// Check if at Fediverse center
console.log('At Fediverse center:', isAtFediverseCenter());

// Get translating position
console.log('Translating:', translating.position);
console.log('Translating target:', translating.targetPosition);
```

---

## 📚 Reference Tables

### Coordinate System Summary

| System | Range (units) | Scale Factor | Parent | Purpose |
|--------|---------------|--------------|--------|---------|
| **Hipparcos** | ±5000 | 1.0 | translating | Real stars |
| **Fediverse** | ±5000 | 100.0 | translating | Instances |
| **Supergiants** | ±250 | 1.0 | translating.fediverseSystem | Three main instances |
| **Grid** | ±5000 | 1.0 | scene | Visual reference |
| **Camera** | Z: 0-50000 | N/A | scene | Viewport |

### Transformation Matrix Flow

```
World Space
  ↓ rotating.matrix
Rotating Space
  ↓ galacticCentering.matrix
Galactic Space
  ↓ translating.matrix
Translating Space (Local Space for most objects)
  ↓ object.matrix
Object Local Space
```

---

## 🔗 Related Documentation

- [Three.js Object3D](https://threejs.org/docs/#api/en/core/Object3D)
- [Three.js Raycaster](https://threejs.org/docs/#api/en/core/Raycaster)
- [Three.js Matrix4](https://threejs.org/docs/#api/en/math/Matrix4)
- [Postmortem INC-002](../postmortem/P1-001-grid-view-camera-positioning.md)
- [Postmortem INC-009](../postmortem/P0-002-fediverse-instances-not-clickable.md)

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-12  
**Maintainer**: Development Team  
**Review Cycle**: Monthly
