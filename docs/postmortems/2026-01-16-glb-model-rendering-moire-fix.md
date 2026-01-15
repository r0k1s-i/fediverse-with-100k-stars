# 尸检报告：GLB 模型渲染摩尔纹与材质问题修复

**日期**: 2026-01-16  
**影响范围**: 所有 GLB 行星模型的渲染质量  
**严重程度**: 中等（视觉问题，不影响功能）  
**状态**: 已解决

---

## 问题描述

从 Sketchfab 下载的 GLB 模型（如 `planet_329_lamplighter.glb`）在项目中渲染效果与 Sketchfab 预览差距很大：

1. **摩尔纹（Moiré Pattern）**: 球体表面出现明显的条纹干涉图案
2. **材质失真**: 灯玻璃、发光物体等显示为灰色，没有预期的透明/发光效果
3. **整体过曝或过暗**: 模型亮度与 Sketchfab 预览不一致

---

## 根本原因分析

### 1. 环境贴图来源不匹配

**问题**: 项目使用**星空 CubeMap** 作为 PBR 材质的环境反射源，而 Sketchfab 使用**工作室 HDR 灯光**。

**结果**: 
- 星空中的星点被反射到光滑表面上
- 星点在曲面上产生摩尔纹干涉图案
- 金属/光滑材质呈现不自然的斑点反射

### 2. 错误的材质参数覆盖

**问题**: 为了"修复"摩尔纹，我们错误地覆盖了 GLB 原始材质参数：

```javascript
// ❌ 错误做法：强制覆盖材质参数
mat.roughness = Math.max(mat.roughness || 0, 0.4);
mat.metalness = Math.min(mat.metalness || 1, 0.3);
mat.emissive.setHex(0x222222);
mat.normalMap = null;
```

**结果**:
- 破坏了艺术家精心调整的 PBR 参数
- 所有 emissive 被设为灰色，发光物体失效
- 需要为每个模型手动猜测和调整材质

### 3. 没有分离视觉背景与 PBR 环境

**问题**: 没有意识到 Three.js 的 `scene.background` 和 `scene.environment` 可以分开设置。

**结果**: 被迫在"星空背景"和"正确的 PBR 反射"之间二选一。

---

## 解决方案

### 核心思路：双环境策略

```
┌─────────────────────────────────────────────────────────┐
│                     渲染管线                              │
├─────────────────────────────────────────────────────────┤
│  视觉背景 (scene.background)    → 星空 CubeMap          │
│  PBR 反射 (scene.environment)   → 工作室 HDR (EXR)      │
└─────────────────────────────────────────────────────────┘
```

### 实施步骤

1. **加载工作室 HDR 环境贴图**
   ```javascript
   // skybox.js
   const exrLoader = new EXRLoader();
   exrLoader.load("cyclorama_hard_light_4k.exr", (texture) => {
     const envMap = pmremGenerator.fromEquirectangular(texture).texture;
     planetScene.environment = envMap;
   });
   ```

2. **保留 GLB 原始材质参数**
   ```javascript
   // ✅ 正确做法：只调整纹理过滤，不覆盖材质参数
   mat[mapType].anisotropy = 16;
   mat[mapType].minFilter = THREE.LinearMipmapLinearFilter;
   mat.envMapIntensity = 1.0; // 使用 scene.environment
   ```

3. **调整曝光以匹配 HDR 亮度**
   ```javascript
   renderer.toneMappingExposure = 0.35;
   ```

4. **仅为缺失 emissive 的模型添加最小化覆盖**
   ```javascript
   // 只针对已知需要发光但 GLB 没有 bake 的部件
   if (modelName.includes("lamplighter") && matName.includes("mat0_box_mat0")) {
     mat.emissive = new THREE.Color(0xFFDD88);
     mat.emissiveIntensity = 2.0;
   }
   ```

---

## 经验教训

### 1. 理解 PBR 工作流的完整性

> **GLB 文件包含完整的 PBR 参数** — roughness, metalness, emissive, normal maps 等都由艺术家精心调整。随意覆盖这些参数会破坏视觉效果。

### 2. 环境光是 PBR 的核心

> **PBR 材质 90% 的视觉效果来自环境光/IBL** — 相同的材质在不同环境光下看起来完全不同。星空背景不是合适的 PBR 环境光源。

### 3. Three.js 的背景与环境是独立的

```javascript
scene.background = starfieldCubemap;  // 用户看到的背景
scene.environment = studioHDR;        // PBR 反射用的环境（用户看不到）
```

### 4. 调试材质问题的正确流程

1. 先在控制台打印材质/mesh 名称，理解模型结构
2. 不要猜测，用日志确认匹配逻辑
3. 优先保留原始参数，只在必要时最小化覆盖

### 5. 摩尔纹的本质

> **摩尔纹 = 高频细节 + 曲面反射** — 解决方案是消除高频源（使用平滑 HDR），而不是破坏材质（降低 metalness/roughness）。

---

## 修复后的代码变更

| 文件 | 变更 |
|------|------|
| `skybox.js` | 添加 `loadStudioEnvironment()` 使用 RGBELoader 加载 HDR |
| `skybox.js` | 调整 `toneMappingExposure = 0.35` |
| `planet-model.js` | 简化 `processLoadedScene()`，保留原始 GLB 参数 |
| `planet-model.js` | 仅为 Lamplighter 灯玻璃/小球添加 emissive 覆盖 |

---

## 性能优化：HDR 环境贴图

### 问题
原始 4K EXR 文件 `cyclorama_hard_light_4k.exr` 体积 **13MB**，比所有 GLB 模型加起来都大。

### 解决方案
使用 Poly Haven 的 1K HDR 替代：
- **之前**: `cyclorama_hard_light_4k.exr` (13MB, EXRLoader)
- **之后**: `studio_small_1k.hdr` (1.6MB, RGBELoader)
- **减少**: 88% 文件体积

### 为什么 1K 足够
环境贴图用于 PBR 反射，不需要高分辨率：
- 反射通常是模糊的（高 roughness 材质）
- PMREMGenerator 会生成 mipmap 金字塔
- 用户不会直接看到环境贴图

---

## 后续建议

1. **为其他模型添加 emissive 覆盖**（如需要）
   - 检查 Sketchfab 预览，确认哪些部件应该发光
   - 添加类似 Lamplighter 的最小化覆盖

2. **考虑使用 Bloom 后处理**
   - Three.js `UnrealBloomPass` 可以让高 emissive 物体产生辉光
   - 更接近 Sketchfab 的视觉效果

3. **建立模型导入规范**
   - 从 Sketchfab 下载时选择 "Original" 格式保留完整材质
   - 记录每个模型的特殊处理需求

---

## 参考资料

- [Three.js PMREMGenerator](https://threejs.org/docs/#api/en/extras/PMREMGenerator)
- [Understanding PBR - Environment Maps](https://marmoset.co/posts/physically-based-rendering-and-you-can-too/)
- [Sketchfab GLB Export Guide](https://help.sketchfab.com/hc/en-us/articles/360046421631)
