# AGENTS.md - Coding Agent Guidelines

---

## 🔒 Constitutional Foundation: Enforcing Architectural Discipline

**Source**: [GitHub Spec-Kit: Spec-Driven Development](https://github.com/github/spec-kit/blob/main/spec-driven.md#the-nine-articles-of-development)

**These rules are MANDATORY and take precedence over all other guidelines in this document.**

### Article I: Library-First Principle

**Rule**: Every feature in this project MUST begin its existence as a standalone library. No feature shall be implemented directly within application code without first being abstracted into a reusable library component.

**Requirements**:
- All new features must be designed as independent, reusable library components first
- Features cannot be implemented directly in application code
- Libraries must have clear boundaries and minimal coupling
- This ensures modular architecture from inception

**Example Violations**:
- ❌ Adding a new color calculation function directly in `index_files/fediverse.js`
- ❌ Implementing position algorithms inline in application code

**Correct Approach**:
- ✅ Creating `scripts/fediverse-processor/colors.go` as a library module
- ✅ Extracting reusable functions into separate modules/files first

### Article II: CLI Interface Mandate

**Rule**: All libraries must expose functionality through command-line interfaces.

**Requirements**:
- All CLI interfaces MUST:
  - Accept text as input (via stdin, arguments, or files)
  - Produce text as output (via stdout)
  - Support JSON format for structured data exchange
- Every capability must be accessible and verifiable through standard interfaces
- Prioritize observability and testability
- Prevent hiding functionality within opaque implementations

**Example Compliance**:
- ✅ `./fediverse-processor` accepts JSON input, produces JSON output
- ✅ `node scripts/fetch-fediverse-data.js --limit=100` (CLI arguments)
- ✅ Text-based logs and structured JSON output

### Article III: Test-First Imperative

**Rule**: All implementation MUST follow strict Test-Driven Development.

**Requirements**:
- No implementation code shall be written before:
  1. Unit tests are written
  2. Tests are validated and approved by the user
  3. Tests are confirmed to FAIL (Red phase)
- Generate comprehensive test suites FIRST
- Obtain user approval for tests
- Confirm tests fail (Red)
- THEN implement solutions to make tests pass (Green)
- This ensures behavior-driven design

**Workflow**:
1. 🔴 **RED**: Write failing tests first
2. ✅ **User Approval**: Get explicit approval for test suite
3. ✅ **Verify Failure**: Confirm tests fail as expected
4. 🟢 **GREEN**: Implement code to pass tests
5. ♻️ **REFACTOR**: Clean up while keeping tests green

**When to Apply**:
- All new features requiring code implementation
- Bug fixes (write test that reproduces bug first)
- Performance optimizations (write performance test first)

**Exceptions**:
- Documentation-only changes
- Configuration file updates
- Trivial refactoring with existing test coverage

---

## Project Overview

**fediverse-with-100k-stars** is a fork of Chrome Experiments' "100,000 Stars" - an interactive 3D WebGL visualization repurposed to display the Fediverse network. Built with Three.js 0.158.0 (ES modules), Mocha/Chai for testing, and vanilla JavaScript.

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
# Unit tests (Mocha/Chai) - run in browser
# Start a local server and open tests/runner.html
python3 -m http.server 8000
# Then open http://localhost:8000/tests/runner.html

# Go tests for data processor
cd scripts/fediverse-processor && go test -v ./...
```

### Linting
```bash
# No linter configured - legacy codebase
```

---

## Project Structure

```
fediverse-with-100k-stars/
├── index.html              # Main entry point
├── AGENTS.md               # Agent guidelines (this file)
├── README.md               # Project documentation
├── data/                   # Generated data files (gitignored)
│   └── fediverse_final.json  # Processed Fediverse instance data (~17MB)
├── docs/                   # Documentation
│   ├── README.md           # Documentation index
│   ├── architecture/       # Architecture decision records
│   │   └── coordinate-systems.md
│   ├── plans/              # Implementation plans
│   │   ├── fediverse-implementation.md  # Main implementation plan
│   │   ├── dual-scene-architecture.md
│   │   └── ...
│   └── postmortems/        # Post-mortem analyses (15+ files)
│       └── README.md       # Postmortem index
├── scripts/                # Data processing scripts
│   └── fediverse-processor/  # Golang processor
│       ├── main.go         # CLI entry point
│       ├── cli.go          # Command-line interface
│       ├── colors.go       # Color calculation library
│       ├── positions.go    # Position calculation library
│       ├── types.go        # Data type definitions
│       ├── go.mod          # Go module definition
│       ├── colors_test.go  # Color unit tests
│       └── positions_test.go # Position unit tests
├── src/                    # Application source
│   ├── assets/             # Static assets
│   │   ├── audio/          # Sound files (bgmusic.ogg)
│   │   ├── draco/          # Draco decoder for glTF compression
│   │   ├── icons/          # UI icons (SVG)
│   │   ├── models/         # 3D models (glTF/GLB)
│   │   │   ├── planets/    # Planet GLB models (25+ models)
│   │   │   └── supergiants/# Supergiant GLB models
│   │   └── textures/       # Textures and images (40+ files)
│   ├── css/                # Stylesheets
│   │   ├── style.css       # Main styles
│   │   ├── fonts.css       # Font definitions
│   │   └── context-menu.css
│   ├── js/                 # JavaScript source
│   │   ├── core/           # Core application modules (30+ files)
│   │   │   ├── main.js           # Initialization and animation loop
│   │   │   ├── fediverse.js      # Fediverse instance rendering
│   │   │   ├── fediverse-interaction.js  # Click/hover interactions
│   │   │   ├── fediverse-labels.js       # Label rendering
│   │   │   ├── galaxy.js         # Galaxy particle system
│   │   │   ├── planet-model.js   # GLB planet model loading
│   │   │   ├── minimap.js        # Minimap navigation
│   │   │   ├── blackhole.js      # Black hole rendering
│   │   │   ├── sun.js            # Sun rendering
│   │   │   ├── constants.js      # Global constants
│   │   │   ├── state.js          # Application state
│   │   │   └── ...
│   │   ├── lib/            # Third-party libraries
│   │   │   ├── three.r158.min.js  # Three.js 0.158.0
│   │   │   ├── three-compat.js    # Three.js compatibility layer
│   │   │   ├── tween.js           # Animation tweening
│   │   │   ├── underscore.js      # Utility functions
│   │   │   ├── model-config.mjs   # Model configuration
│   │   │   ├── planet-render-config.mjs  # Planet rendering config
│   │   │   └── ...
│   │   ├── utils/          # Utility modules
│   │   │   ├── app.js            # Application utilities
│   │   │   ├── dom.js            # DOM utilities
│   │   │   ├── math.js           # Math utilities
│   │   │   ├── interaction-zoom.js
│   │   │   └── ...
│   │   └── workers/        # Web Workers
│   │       └── data-loader.worker.js  # Background data loading
│   └── shaders/            # GLSL vertex/fragment shaders
│       ├── datastars.*     # Data star rendering
│       ├── galactic*.*     # Galaxy rendering
│       ├── starsurface.*   # Star surface rendering
│       ├── starflare.*     # Star flare effects
│       └── ...
├── tests/                  # Test suites
│   ├── lib/                # Mocha/Chai test framework
│   │   ├── mocha.js
│   │   ├── mocha.css
│   │   └── chai.js
│   ├── unit/               # Unit tests (20+ files)
│   │   ├── interaction-math.test.js
│   │   ├── minimap.test.js
│   │   ├── planet-render-config.test.mjs
│   │   ├── zoom-in.test.js
│   │   └── ...
│   └── runner.html         # Browser test runner
└── detail/                 # Detail page assets
    └── about.html
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

### Three.js Patterns (Modern 0.158.0)

**ES Module Import**:
```javascript
import * as THREE from 'three';
window.THREE = THREE;  // Legacy compatibility
```

**Object Creation**:
```javascript
// Modern Geometry + Material + Mesh pattern
const geometry = new THREE.PlaneGeometry(150000, 150000, 30, 30);
const textureLoader = new THREE.TextureLoader();
const material = new THREE.MeshBasicMaterial({
    map: textureLoader.load('path/to/texture.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false
});
const mesh = new THREE.Mesh(geometry, material);
```

**Shader Materials**:
```javascript
const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: datastarUniforms,
    vertexShader: shaderList.datastars.vertex,
    fragmentShader: shaderList.datastars.fragment,
    blending: THREE.AdditiveBlending,
    transparent: true
});
// Note: attributes are now set via BufferGeometry.setAttribute()
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

### Runtime Libraries (src/js/lib/)

| Library | Version | Purpose |
|---------|---------|---------|
| Three.js | 0.158.0 (ES module via importmap) | 3D WebGL rendering |
| Underscore.js | 1.x | Utility functions |
| Tween.js | - | Animation interpolation |
| Draco Decoder | - | glTF mesh compression |

### Dev Dependencies (package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| gltf-pipeline | ^4.3.0 | GLB/glTF optimization |
| lil-gui | ^0.21.0 | Debug GUI (development) |

**Note**: jQuery has been removed. The codebase uses ES modules with `import * as THREE from 'three'` (via importmap). Legacy compatibility is maintained via `window.THREE = THREE` in main.js. The `three-compat.js` module provides additional compatibility shims.

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
1. **Update plan document** (`docs/plans/fediverse-implementation.md`) on every new discussion or technical decision change
2. **Update plan document** after completing code modifications or implementations
3. **Update "当前状态" section** in plan document after each task completion:
   - Mark completed phases with `[x]`
   - Update "更新时间" timestamp
   - Update "当前阶段" description
   - Update "下一步行动" list

### Data Script Language Preference
1. **Use Golang** for all data processing scripts
2. Scripts should be placed in `scripts/` directory
3. Follow CLI Interface Mandate (Article II) - accept stdin/args, output JSON

### Git Commit Rules
1. **Auto-commit** code changes after completing each task
2. **Commit message format**: Follow [gitmoji](https://gitmoji.dev/) convention
3. **No-commit during live debug unless approved**: When actively debugging with the user, do not create any commit without explicit user confirmation, even if changes are complete.
4. 🛑 **CRITICAL: DO NOT TRACK TEMPORARY SCRIPTS** 🛑: Any agent-created test or temporary scripts MUST live in a temporary directory and MUST NOT be committed or tracked by git. Double check `git status` before adding files.

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
