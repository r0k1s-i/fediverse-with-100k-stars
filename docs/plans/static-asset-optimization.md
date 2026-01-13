# Static Asset Optimization Plan

**Created**: 2026-01-13
**Status**: ✅ Complete

## 🎯 Goal
Optimize static resource loading to improve initial load time and memory usage.

## 📋 Phases

### Phase 1: Asset Management Infrastructure
- [x] **Asset Manager Library**: Create a centralized `AssetManager` to handle texture loading and caching.
- [x] **Test Suite**: Implement unit tests for `AssetManager` ensuring single-source-of-truth for assets.

### Phase 2: Deduplication & Optimization
- [x] **Texture Deduplication**: Refactor `fediverse.js`, `sun.js`, and `galaxy.js` to use `AssetManager`.
- [x] **Preload Fix**: Align `index.html` preload tags with actual requested paths (fix `fediverse_final.json` mismatch).

### Phase 3: Lazy Loading (Future)
- [x] **Lazy Audio**: Defer audio loading until interaction.
- [ ] **Lazy Textures**: Defer high-res sun textures until close-up.

## 🛠 Implementation Details

### AssetManager
- **Singleton**: Ensures only one instance of the manager exists.
- **Caching**: Stores loaded textures by URL/Key to prevent duplicate network requests.
- **Promise-based**: Returns promises for async handling.

## 🧪 Testing Strategy
- Browser-based test runner (`tests/runner.html`).
- Mocha/Chai for assertions.
- Mocking `THREE.TextureLoader` behavior.
