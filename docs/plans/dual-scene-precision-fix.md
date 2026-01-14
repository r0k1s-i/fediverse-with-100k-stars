# 双场景架构：解决顶点精度问题

## 问题描述

渲染单颗星星时，模型顶点在大坐标下闪烁：
- 场景坐标：~2500 光年
- 顶点偏移：~1e-7 光年
- float32 精度：~7位有效数字
- GPU 计算 `2500 + 0.0000001` 时精度丢失

## 当前方案（待重构）

- Layer 分层渲染 (Layer 0/1)
- `clearDepth()` 隔离
- 模型 scale 放大到 1.0 LY
- 文件：`src/js/core/main.js`, `src/js/core/planet-model.js`

## 目标方案：双场景架构

**核心思想**：模型始终在 `(0,0,0)` 渲染，GPU 永远不计算大坐标+微小偏移。

---

## 实现步骤

### Phase 1: 创建独立场景结构

**文件**: `src/js/core/main.js`

1. 在 `initScene()` 中创建：

```javascript
// 行星专用场景（本地坐标系，小单位）
const planetScene = new THREE.Scene();
const localRoot = new THREE.Object3D();
localRoot.name = 'localRoot';
planetScene.add(localRoot);

// 行星专用相机（紧凑的 near/far）
const planetCamera = new THREE.PerspectiveCamera(
  45,
  screenWidth / screenHeight,
  1e-6,   // 极近
  10.0    // 极小 far
);
planetCamera.position.set(0, 0, 3);

// 添加光照到 planetScene
const planetLight = new THREE.DirectionalLight(0xffffff, 2.0);
planetLight.position.set(1, 1, 1);
planetScene.add(planetLight);

const planetAmbient = new THREE.AmbientLight(0xffffff, 0.5);
planetScene.add(planetAmbient);

// 暴露到全局
window.planetScene = planetScene;
window.localRoot = localRoot;
window.planetCamera = planetCamera;
```

### Phase 2: 修改 starModel 挂载逻辑

**文件**: `src/js/core/starmodel.js`

修改 `setStarModel()`:

```javascript
export function setStarModel(position, name) {
    var starModel = window.starModel;
    var localRoot = window.localRoot;
    if (!starModel || !localRoot) return;

    hideAllSubStars();
    
    // 关键改动：挂载到 localRoot，位置保持原点
    if (starModel.parent !== localRoot) {
        if (starModel.parent) starModel.parent.remove(starModel);
        localRoot.add(starModel);
    }
    
    starModel.position.set(0, 0, 0);  // ← 核心：不赋大坐标
    starModel.userData.galaxyPosition = position.clone(); // 仅存储
    starModel.setSpectralIndex(0.5);
    starModel.setScale(1.0);
}
```

**文件**: `src/js/core/main.js`

修改 `makeStarModels()` 调用后的挂载：

```javascript
// 原代码 (删除):
// translating.add(starModel);

// 新代码:
// starModel 初始不挂载，等 setStarModel 时挂到 localRoot
```

### Phase 3: 修改渲染循环

**文件**: `src/js/core/main.js`

修改 `render()` 函数：

```javascript
function render() {
  // 1. 渲染天空盒
  if (enableSkybox) {
    renderSkybox();
  }
  
  // 2. 渲染银河场景（光年单位）
  renderer.autoClear = false;
  if (enableSkybox) {
    renderer.clearDepth();
  }
  renderer.render(scene, camera);
  
  // 3. 渲染行星场景（本地坐标系）
  var planet = window.starModel;
  if (planet && planet.visible) {
    // 同步 planetCamera 方向（可选：保持视角连续性）
    syncPlanetCamera();
    
    renderer.clearDepth();
    renderer.render(planetScene, planetCamera);
  }
  
  renderer.autoClear = true;
}

// 新增辅助函数
function syncPlanetCamera() {
  var planetCamera = window.planetCamera;
  if (!planetCamera) return;
  
  // 保持与主相机相同的朝向，但固定距离
  // 简单实现：固定位置看原点
  planetCamera.position.set(0, 0, 3);
  planetCamera.lookAt(0, 0, 0);
  
  // 可选：复制主相机 FOV
  // planetCamera.fov = camera.fov;
  // planetCamera.updateProjectionMatrix();
}
```

### Phase 4: 清理 planet-model.js

**文件**: `src/js/core/planet-model.js`

移除不再需要的 hack：

1. 删除 `obj.layers.set(1)` 相关代码（约 L145-171）
2. 删除 `obj.renderOrder = 100 + ...` 设置
3. `targetSize` 可以改回物理正确的小值（如 `1e-7`），或保持 `1.0` 作为"本地单位"
4. 删除 root 内的 light（已移到 planetScene）

```javascript
// 删除这段:
// obj.layers.set(1);
// obj.renderOrder = 100 + instanceMeshCounter;

// 删除这段:
// root.traverse((obj) => {
//   if (obj.isLight) {
//     obj.layers.set(1);
//   }
// });
```

### Phase 5: 修改交互逻辑

**文件**: `src/js/core/fediverse-interaction.js`

确保 `starModel.position.copy(closestInst.position)` 改为使用 `setStarModel()`:

```javascript
// 原代码 (约 L134-135):
// starModel.position.copy(closestInst.position);

// 改为:
window.setStarModel(closestInst.position, closestInst.name);
```

---

## 文件改动清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/js/core/main.js` | 新增 | planetScene, localRoot, planetCamera |
| `src/js/core/main.js` | 修改 | render() 双场景渲染 |
| `src/js/core/main.js` | 删除 | starModel 不再挂载到 translating |
| `src/js/core/main.js` | 删除 | Layer 0/1 切换逻辑 |
| `src/js/core/starmodel.js` | 修改 | setStarModel() 挂载到 localRoot，位置=原点 |
| `src/js/core/planet-model.js` | 删除 | layers.set(1), renderOrder hack |
| `src/js/core/planet-model.js` | 删除 | root 内的 light |
| `src/js/core/fediverse-interaction.js` | 修改 | 使用 setStarModel() |

---

## 验证方法

1. 缩放到任意远距离星星（>1000 LY）
2. 观察 planet 模型是否还有闪烁
3. 控制台运行 `debugPlanetZFighting()` 检查状态
4. 确认模型 position 为 `(0, 0, 0)`

---

## 可选增强

- **相机过渡动画**：进入行星模式时平滑切换 FOV
- **UI 提示**：显示 "进入 [星名] 近景"
- **planetCamera 控制**：允许用户在行星视图中旋转/缩放

---

## 当前状态

- [x] 问题分析完成
- [x] 方案设计完成
- [x] Phase 1: 创建独立场景
- [x] Phase 2: 修改 starModel 挂载
- [x] Phase 3: 修改渲染循环
- [x] Phase 4: 清理 hack 代码
- [x] Phase 5: 修改交互逻辑
- [ ] 验证测试

**更新时间**: 2026-01-15
