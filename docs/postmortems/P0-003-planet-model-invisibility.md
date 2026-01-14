# Postmortem: P0-003 Planet Model Invisibility in Dual Scene Architecture

**Date**: 2026-01-15
**Incident Level**: P0 (Critical Feature Broken)
**Status**: Resolved
**Authors**: Sisyphus

## 1. Incident Summary
After implementing the "Dual Scene Architecture" to fix z-fighting and floating point jitter for distant Fediverse instances, the close-up planet model (GLB) became completely invisible or behaved erratically (wrong size, not closing).

**Impact**:
- Users clicking on a Fediverse instance saw no planet model (empty space).
- When fixed partially, the planet model was enormous (filling screen) and couldn't be dismissed.
- Zooming out didn't properly hide the model.

**Root Cause**:
A combination of scene graph detachment (planet scene vs main scene), missing update loops for the detached scene, and logic errors in coordinate synchronization between the two scenes.

## 2. Technical Details

### Issue 1: The "Invisible" Planet
**Symptom**: `starModel.visible` was true, but nothing appeared on screen.
**Cause**:
1. `starModel` was moved to `planetScene` (detached from main `scene`).
2. The animation loop in `main.js` called `rotating.traverse(mesh => mesh.update())`.
3. Since `starModel` was no longer a child of `rotating`, its `update()` method was **NEVER called**.
4. The GLB loader's callback sets `_planetMesh.visible = root.visible` inside `update()`.
5. Result: `root.visible` was true, but the actual mesh `_planetMesh.visible` remained false.

**Fix**: Explicitly call `planet.update()` in the render loop.

```javascript
// src/js/core/main.js
if (planet && planet.visible) {
    if (planet.update) planet.update(); // Manual update trigger
    // ... render planet scene
}
```

### Issue 2: The "Infinite Loop" Position Check
**Symptom**: `setStarModel` was called every single frame, killing performance.
**Cause**:
1. Logic checked `starModel.position.distanceTo(targetPos) > 0.1`.
2. In Dual Scene, `starModel` is always at `(0,0,0)`.
3. `targetPos` is in Galaxy coordinates (e.g., `2000, 100, -500`).
4. Distance is always huge, triggering update every frame.

**Fix**: Store `galaxyPosition` in `userData` and compare against that.

```javascript
// src/js/core/fediverse-interaction.js
var trackedGalaxyPosition = starModel.userData.galaxyPosition;
var isNewInstance = trackedGalaxyPosition.distanceTo(closestInst.position) > 0.1;
```

### Issue 3: The "Giant Planet" (Scale Issue)
**Symptom**: Planet occupied 100% of the screen.
**Cause**:
1. `planetCamera` had a fixed FOV (45) and position (z=3).
2. The model scaler calculated size to fit in this view.
3. However, `makeStarModels` applied a `baseScaleMultiplier` of 2.0, effectively doubling the size.
4. When `setScale` was called with large instance sizes (e.g., 2.0), the result was huge.

**Fix**: Adjusted `baseScaleMultiplier` to 0.8 and implemented dynamic camera positioning.

### Issue 4: The "Unresponsive" Camera (Zoom Sync)
**Symptom**: Zooming in/out in the main scene didn't change the planet's size.
**Cause**: `planetCamera` was fixed at `(0,0,3)`.
**Fix**: Implemented `syncPlanetCamera` with a dynamic mapping algorithm.

```javascript
// Logic: Map mainCamera Z (near -> far) to planetCamera Z (3.0 -> 20.0)
if (mainZ < fadeStart) {
    planetCamZ = (3.0 + t * 2.0) * scaleCompensation;
} else ...
```

### Issue 5: Missing Export
**Symptom**: Planet model visibility logic never ran.
**Cause**: `updateFediverseInteraction` was defined but **not exported** to `window`, so the main loop couldn't call it.
**Fix**: Added `window.updateFediverseInteraction = updateFediverseInteraction`.

## 3. Lessons Learned

### Architectural
1. **Detached Scenes require Manual Management**: When moving objects to a separate scene (like `planetScene`), they lose the "auto-magic" updates from the main scene traversal. You must manually manage their update cycle.
2. **Coordinate System Separation**: When using dual coordinates (Galaxy vs Local), **never** compare positions directly between them. Always store the "virtual" position metadata.

### Process
1. **Debug Logging is Vital**: We wasted time guessing until we added verbose logs to `render()`, which immediately revealed `planetMeshVisible: false`.
2. **Visual Debugging**: The issue was invisible (literally). Writing a "debug HUD" or simply logging render state to console earlier would have saved 3 iterations.

## 4. Action Items

- [x] Fix `starModel` visibility update loop (Done)
- [x] Fix coordinate comparison logic (Done)
- [x] Implement dynamic camera sync (Done)
- [x] Fix scale calculations (Done)
- [ ] **Recommendation**: Add a permanent debug overlay for Dual Scene state (e.g., "Planet Visible: Yes/No", "Camera Z: ...") to prevent future regressions.

