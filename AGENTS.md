# AGENTS.md - Coding Agent Guidelines

## Project Overview

**100k-Star-Challenge** is a fork of Chrome Experiments' "100,000 Stars" - an interactive 3D WebGL visualization of the stellar neighborhood showing over 100,000 nearby stars. Built with Three.js (r58-era), jQuery, and vanilla JavaScript.

**Live original**: https://stars.chromeexperiments.com

---

## Build & Run Commands

### Development Server
```bash
# No build step required - static HTML/JS project
# Use any static file server:
python3 -m http.server 8000
# OR
npx serve .
# OR
npx http-server .
```

### Testing
```bash
# No test framework configured
# Manual testing: Open index.html in Chrome with WebGL support
```

### Linting
```bash
# No linter configured - legacy codebase
```

---

## Project Structure

```
100k-Star-Challenge/
├── index.html          # Main entry point (loads all scripts)
├── index.css           # Minimal root styles (used by index.js)
├── index.js            # Custom application wrapper (namespace pattern)
├── index.sim.json      # Simulation configuration
├── index_files/        # All source files and assets
│   ├── main.js         # Core initialization and animation loop
│   ├── galaxy.js       # Milky Way galaxy generation
│   ├── hipparcos.js    # Hipparcos star catalog rendering
│   ├── solarsystem.js  # Solar system planets and orbits
│   ├── starmodel.js    # Individual star 3D models
│   ├── sun.js          # Sun rendering
│   ├── tour.js         # Guided tour functionality
│   ├── mousekeyboard.js # Input handling
│   ├── util.js         # Utility functions
│   ├── three.min.js    # Three.js r58 (legacy)
│   ├── tween.js        # Animation tweening
│   ├── style.css       # Main stylesheet
│   └── [shaders, textures, data files...]
```

---

## Code Style Guidelines

### JavaScript Patterns

**Global Scope Pattern**: This codebase uses globals extensively (legacy pattern).
```javascript
// Variables declared at file scope
var pSystem;
var camera;
var scene;

// Functions at global scope
function generateGalaxy() { ... }
```

**Naming Conventions**:
- Variables: `camelCase` - `starData`, `pGalacticSystem`, `rotateVX`
- Functions: `camelCase` - `initScene()`, `loadStarData()`, `updateMarkers()`
- Constants: `UPPER_SNAKE_CASE` (rare) or `camelCase`
- Prefixes: `p` for particle systems (`pSystem`, `pGalaxy`), `$` for jQuery objects (`$starName`)

**Function Style**:
```javascript
// Named function declarations (preferred)
function makeSolarSystem() {
    var solarSystem = new THREE.Object3D();
    // ...
    return solarSystem;
}

// Function expressions for callbacks
var postShadersLoaded = function() {
    // ...
};
```

### Three.js Patterns (Legacy r58)

**Object Creation**:
```javascript
// Geometry + Material + Mesh pattern
var geometry = new THREE.PlaneGeometry(150000, 150000, 30, 30);
var material = new THREE.MeshBasicMaterial({
    map: THREE.ImageUtils.loadTexture('path/to/texture.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false
});
var mesh = new THREE.Mesh(geometry, material);
```

**Shader Materials**:
```javascript
var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: datastarUniforms,
    attributes: datastarAttributes,  // Legacy API
    vertexShader: shaderList.datastars.vertex,
    fragmentShader: shaderList.datastars.fragment,
    blending: THREE.AdditiveBlending,
    transparent: true
});
```

**Scene Hierarchy**:
```javascript
// Nested Object3D for transforms
rotating = new THREE.Object3D();
translating = new THREE.Object3D();
rotating.add(translating);
scene.add(rotating);
```

### CSS Patterns

**Naming**: Hyphenated lowercase IDs and classes
```css
#detail-container { }
.legacy-marker { }
#zoom-levels { }
```

**Vendor Prefixes**: All prefixes included (legacy browser support)
```css
-webkit-transition: opacity 0.25s;
-moz-transition: opacity 0.25s;
-ms-transition: opacity 0.25s;
-o-transition: opacity 0.25s;
transition: opacity 0.25s;
```

---

## Key Technical Notes

### Animation Loop
```javascript
function animate() {
    camera.update();
    // Update all objects with update() method
    rotating.traverse(function(mesh) {
        if (mesh.update !== undefined) {
            mesh.update();
        }
    });
    render();
    requestAnimationFrame(animate);
    TWEEN.update();
}
```

### Update Pattern
Objects that need per-frame updates implement an `update()` method:
```javascript
pGalacticSystem.update = function() {
    galacticUniforms.zoomSize.value = 1.0 + 10000 / camera.position.z;
    // ...
};
```

### Coordinate System
- Units: Light years (LY)
- Sun at origin (0, 0, 0)
- Galactic center offset: `position.x = 27000` (27,000 LY from Sun)
- Conversion: `KMToLY(km)` for kilometers to light years

### Data Loading
Star data loaded asynchronously from JSON:
```javascript
loadStarData("index_files/stars_all.json", function(loadedData) {
    starData = loadedData.stars;
    initScene();
    animate();
});
```

---

## Error Handling

**WebGL Detection**:
```javascript
if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
    return;
}
```

**Defensive Checks**:
```javascript
if (mesh.update !== undefined) {
    mesh.update();
}
```

---

## Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| Three.js | r58 (legacy) | 3D WebGL rendering |
| jQuery | 1.7.1 | DOM manipulation |
| Underscore.js | 1.x | Utility functions |
| dat.GUI | - | Debug controls |
| Tween.js | - | Animation interpolation |

---

## Browser Requirements

- WebGL support required
- Chrome recommended (originally a Chrome Experiment)
- Modern browsers with WebGL 1.0+

---

## Common Modifications

### Adding a New Star/Object
1. Create geometry and material
2. Add to `translating` Object3D
3. Implement `update()` method for animations
4. Optionally attach marker via `attachMarker()` or `attachLegacyMarker()`

### Modifying Camera Behavior
Edit `camera.update()` in `main.js` - handles zoom easing and position updates.

### Adding Tour Stops
Modify `GALAXY_TOUR` constant (defined elsewhere, used by `Tour` class).

---

## Performance Considerations

- Particle systems use `BufferGeometry` where possible
- LOD (Level of Detail) via visibility toggling based on `camera.position.z`
- Additive blending with `depthTest: false` for glow effects
- Shader-based rendering for 100k+ stars

---

## File Modification Guidelines

1. **Preserve global patterns** - Don't refactor to modules (breaks dependencies)
2. **Test in Chrome first** - Original target browser
3. **Check zoom levels** - UI visibility tied to camera distance
4. **Maintain vendor prefixes** - Legacy browser support expected

---

## Agent Workflow Rules

### Documentation Updates
1. **Update plan document** (`FEDIVERSE_IMPLEMENTATION_PLAN.md`) on every new discussion or technical decision change
2. **Update plan document** after completing code modifications or implementations

### Git Commit Rules
1. **Auto-commit** code changes after completing each task
2. **Commit message format**: Follow [gitmoji](https://gitmoji.dev/) convention

```
<emoji> <type>: <short description>

Examples:
✨ feat: add Fediverse data fetcher script
🐛 fix: correct pagination cursor handling
♻️ refactor: extract color calculation to separate module
📝 docs: update implementation plan with color algorithm
🎨 style: improve code formatting in main.js
⚡ perf: optimize particle system rendering
🔧 config: add API rate limit configuration
```

Common gitmoji:
- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- ♻️ `:recycle:` - Refactor
- 📝 `:memo:` - Documentation
- 🎨 `:art:` - Style/format
- ⚡ `:zap:` - Performance
- 🔧 `:wrench:` - Configuration
- 🚀 `:rocket:` - Deploy
- ✅ `:white_check_mark:` - Tests
- 🔥 `:fire:` - Remove code/files
