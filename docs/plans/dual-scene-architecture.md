# 双场景渲染优化总结报告 (Dual Scene Architecture Report)

## 1. 目标
解决原有渲染架构中存在的 **Z-fighting（深度冲突）** 和 **浮点精度抖动** 问题。
当 Fediverse 实例坐标很大（如 `x: 2000`）时，Web 3D 渲染引擎在处理近距离观察（行星模型）时会产生剧烈的模型表面闪烁。

## 2. 实施方案：双场景架构 (Dual Scene)

我们从单一场景渲染转向了双场景架构：

| 组件 | 原架构 (Legacy) | 新架构 (Dual Scene) | 优势 |
| :--- | :--- | :--- | :--- |
| **场景结构** | 所有物体（银河、行星）都在同一个 `scene` 中。 | **Main Scene**: 银河、背景<br>**Planet Scene**: 仅包含行星模型。 | 彻底隔离，互不干扰。 |
| **坐标系统** | 行星使用真实世界坐标（例如 `2000, 100, -500`）。 | 行星在 `Planet Scene` 中永远位于原点 `(0, 0, 0)`。 | **彻底消除**大坐标带来的精度误差。 |
| **相机** | 单一 `camera`，Near/Far 平面跨度巨大 (0.1 ~ 1e7)。 | **Main Camera**: 渲染银河。<br>**Planet Camera**: 渲染行星，Near/Far 紧凑 (0.1 ~ 100)。 | 极大提高了深度缓冲区的精度。 |
| **渲染流程** | 一次 `renderer.render()`。 | 两次 Render Pass：<br>1. 渲染背景 (清除深度)<br>2. 渲染行星 (覆盖在最上层) | 确保行星永远在背景之上，无穿插。 |

## 3. 遇到的挑战与修复

在实施过程中，我们解决了一系列棘手的渲染问题：

### A. 屏幕 3/4 黑屏问题
*   **现象**: 屏幕大部分区域变黑，只有左下角有图像。
*   **原因**: 手动调用 `renderer.setViewport(0, 0, window.innerWidth, ...)` 时使用了 CSS 像素，而 WebGL 需要设备像素（Device Pixels）。在高 DPI (Retina) 屏幕上，这导致视口只有实际屏幕的 1/4 或更小。
*   **修复**: 移除了手动视口重置，依赖 Three.js 内部正确的自动管理。

### B. 星球模型不可见 (Invisibility)
这是一个多重因素导致的复合问题：
1.  **投影矩阵失效**: `planetCamera` 初始化时 `aspect` 可能为 NaN，导致 Projection Matrix 全零。 -> **修复**: 增加了 `aspect` 的安全检查。
2.  **对象引用错误**: `main.js` 仍然使用旧版 `makeStarModels` 创建 Shader 球体，而非新的 GLB 模型。由于旧 Shader 依赖旧坐标系，在新架构下不可见。 -> **修复**: 修正了 import 路径，指向 `planet-model.js`。
3.  **位置同步失败**: `window.setStarModel` 未在 `main.js` 导入，导致交互逻辑回退到旧版 "复制坐标" 逻辑，把模型扔到了相机视野之外的远方。 -> **修复**: 显式导入并注册 `setStarModel`。
4.  **初始渲染状态**: 模型加载后的第一帧可能未更新矩阵。 -> **修复**: 在 `setStarModel` 中强制执行 `updateMatrixWorld(true)`。

## 4. 最终状态

*   **代码库**: 已提交所有修复。
    *   `src/js/core/main.js`: 包含双场景渲染循环、相机同步逻辑。
    *   `src/js/core/planet-model.js`: GLB 模型加载、标准化。
    *   `src/js/core/starmodel.js`: 负责将模型归零并挂载到新场景。
    *   `src/js/core/fediverse-interaction.js`: 正确调用新的定位接口。
*   **调试工具**: 已移除所有临时性的红色立方体、绿色线框和大量日志。

## 5. 后续建议 (Next Steps)

虽然架构已经就绪，但如果在特定环境下仍不可见，建议在新的 Thread 中检查：
1.  **资源加载**: 确认 `src/assets/textures/kamistar.glb` 是否成功加载（网络请求 200）。
2.  **光照微调**: 当前使用了简单的 DirectionalLight，可能需要根据 GLB 材质调整光强或环境光。
3.  **相机同步逻辑**: 目前 `syncPlanetCamera` 只是固定在 `(0,0,3)`。未来可以让它同步主相机的旋转，以便观察行星的侧面或背面。

---
**Report Generated**: 2026-01-15
