# Postmortem: Black Screen After Fediverse Data Load

**Date**: 2026-01-16
**Incident Level**: P0 (Application Unusable)
**Status**: Resolved
**Authors**: Sisyphus

## 1. Incident Summary
After Fediverse data loaded successfully, the application rendered a black screen with no visible scene or UI feedback. Rendering was active (draw calls present), but the camera state became invalid, leaving the scene effectively invisible.

**Impact**:
- Users saw a black screen after loading completed.
- No visible feedback or fallback UI suggested what failed.

**Root Cause**:
`camera.position.target.x/y` were never initialized. In `animate()`, the camera position interpolation performed math with `undefined`, which produced `NaN`. Once `camera.position.x` became `NaN`, projection updates and render transforms produced no visible output.

## 2. Technical Details

**Trigger Path**:
1. `loadFediverseData()` succeeded and `initScene()` finished.
2. `animate()` ran and executed:
   ```javascript
   camera.position.x += (camera.position.target.x - camera.position.x) * 0.95;
   ```
3. `camera.position.target.x` was `undefined`, so the expression yielded `NaN`.
4. The camera transform became invalid, resulting in a black screen despite ongoing rendering.

**Why It Took Time to Diagnose**:
- There were no runtime guards on camera targets (only `z/pz` were initialized).
- Rendering continued without throwing errors, so no obvious exception was reported.
- Debugging required manual instrumentation to confirm scene creation, draw calls, and camera state.

## 3. Resolution

**Fix**:
Ensure `camera.position.target` initializes `x`, `y`, `z`, and `pz` together.

```javascript
// src/js/utils/app.js
camera.position.target = { x: initialX, y: initialY, z: initialZ, pz: initialZ };
```

**Regression Test**:
Added/updated unit test to assert `x/y` are initialized by `ensureCameraTarget()`.

## 4. Lessons Learned

### Engineering
1. **Guard All Target Axes**: Partial initialization is unsafe when later math assumes full vectors.
2. **Render Can Fail Silently**: `NaN` state can cause black screens without throwing exceptions.

### Process
1. **Early State Invariants**: Add a minimal camera/scene invariant check before starting `animate()`.
2. **Debugging Playbook**: When black screens occur, immediately log camera position, target, and draw calls.

## 5. Action Items
- [x] Initialize `camera.position.target.x/y` in `ensureCameraTarget`.
- [x] Add regression coverage for `ensureCameraTarget`.
- [ ] Add a lightweight runtime assertion for camera target validity in debug builds.
