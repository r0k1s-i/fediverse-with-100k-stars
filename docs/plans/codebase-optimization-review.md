# 代码深度分析与优化整改计划

**更新日期**: 2026-01-16
**状态**: ✅ 阶段 A 完成
**当前阶段**: 阶段 D - 优化与清理 (完成)
**范围**: 渲染性能、交互稳定性、资源加载、可维护性与测试

---

## 一、现状与关键观察

> 本节基于现有文档与核心代码（`src/js/core/*`、`src/js/utils/*`、`scripts/fediverse-processor/*`）的阅读与结构性分析。

### 1) 架构与全局状态
- 目前核心流程依赖大量 `window.*` 全局变量，模块之间隐式耦合较强（例如 `src/js/core/main.js`、`src/js/core/fediverse-interaction.js`）。
- 仍存在多处局部参数与 `constants.js` 定义不一致的问题（如 `markerThreshold`、`camera` 相关数值在多个文件中重复定义）。

### 2) 渲染与性能热点
- 鼠标移动时 `Raycaster` + 逐实例数学筛选并存，存在重复计算路径（`src/js/core/fediverse-interaction.js` + `src/js/core/interaction-math.js`）。
- `LabelLayout` 每帧 O(n^2) 交叉检测，尽管当前规模可接受，但未来规模扩大时会成为瓶颈（`src/js/core/label-layout.js`）。
- `generateGalaxy()` 每次调用都会重新生成 100k 缓冲数据，缺乏显式缓存与重用机制（`src/js/core/galaxy.js`）。

### 3) 资源与加载策略
- GLB 依赖 Draco 解码器的外部 CDN（`src/js/core/planet-model.js`），网络受限时会导致模型加载失败。
- `AssetManager` 缓存纹理但无释放策略，长时间运行可能累积 GPU 内存（`src/js/core/asset-manager.js`）。

### 4) 数据流与可观测性
- `XMLHttpRequest` 一次性加载并解析完整 JSON，体积较大时会阻塞主线程（`src/js/core/fediverse.js`）。
- 缺少统一的性能与加载时序统计，影响问题复盘效率。

### 5) 测试与回归保障
- Go 数据处理器测试覆盖较好，但 JS 交互/渲染逻辑测试覆盖不足（仅少量单元测试）。
- 多数交互逻辑依赖 DOM + WebGL 环境，缺少可控的纯函数测试分层。

---

## 二、优化整改建议（按优先级）

### P0：稳定性与可用性
1. **离线 Draco 解码器策略** ✅
   - 将 Draco 解码器放入本地资源目录，并增加本地优先加载逻辑，避免外部网络依赖。
   - 需要更新 `src/js/core/planet-model.js` 中 `setDecoderPath()` 的策略。

2. **统一阈值与配置源** ✅
   - 将 `markerThreshold`、交互阈值、缩放阈值统一迁移到 `src/js/core/constants.js`，避免逻辑漂移。

3. **交互路径收敛** ✅
   - 统一 `Raycaster` 与 `InteractionMath.findClosestInstance()` 的入口，避免双重判定与交互抖动。

### P1：性能与资源优化
4. **LabelLayout 空间分桶** ✅
   - 使用网格分桶或简单 QuadTree，降低 `LabelLayout` 碰撞检测到近似 O(n)。

5. **数据加载拆分与 Worker 化** ✅
   - `fediverse_final.json` 体积较大，建议使用 Web Worker 做解析并返回结构化数据。
   - 或在构建阶段切分为多个区块以支持渐进加载。

6. **纹理缓存释放策略** ✅
   - `AssetManager` 增加 `dispose()` 与 LRU 淘汰策略，减少 GPU 内存滞留。

### P2：可维护性与工程化
7. **全局状态依赖的显式化** (部分完成)
   - 核心模块通过集中 `state` 对象进行读写，减少 `window.*` 的隐式依赖。

8. **性能观测与诊断工具** ✅
   - 增加可切换的性能统计面板（加载时间、帧耗时、纹理占用）。

9. **测试分层与可重复性** (部分完成)
   - 将交互逻辑拆分为纯函数，并补充单元测试。
   - 对关键数值（阈值与坐标换算）补回归测试，降低后续迁移风险。

---

## 三、建议执行路线图

### 阶段 A（1-2 天）
- [x] 本地化 Draco 解码器与加载回退策略 ✅ (2026-01-16)
  - 下载 Draco 1.5.6 解码器到 `src/assets/draco/`
  - 在 `constants.js` 添加 `DRACO` 配置和 `getDracoDecoderPath()` 函数
  - 修改 `planet-model.js` 使用本地优先加载策略
  - 添加单元测试 `tests/unit/draco-loader.test.js`
  - **修复**: 实现真正的回退策略 - 新增 `getDracoDecoderPaths()` 返回路径数组
  - **修复**: `loadGLBWithFallback()` 在 Draco 解码失败时自动切换到 CDN 重试
- [x] 本地化测试依赖 ✅ (2026-01-16)
  - 下载 mocha.js, mocha.css, chai.js 到 `tests/lib/`
  - 更新 `tests/runner.html` 使用本地路径
  - 测试文件使用全局 `window.expect` 代替 CDN 导入
  - 注：Three.js 保持 CDN 加载，3D 相关测试仍需网络
- [x] 整理常量：迁移重复数值至 `constants.js` ✅ (2026-01-16)
  - 统一 CAMERA (FOV, NEAR_CLIP, FAR_CLIP, ZOOM limits) 到 main.js, skybox.js, mousekeyboard.js
  - 统一 VISIBILITY.MARKER (MIN_Z, MAX_Z) 到 main.js, legacymarkers.js, fediverse.js
  - 统一 VISIBILITY.GRID.MAX_Z 到 fediverse.js
  - 新增 VISIBILITY.GALAXY.HIDE_Z 并应用到 galaxy.js, dust.js
  - 更新 ZOOM.MAX 从 50000 到 80000 以匹配实际使用
- [x] 交互判定路径合并 ✅ (2026-01-16)
  - 新增 `INTERACTION.THRESHOLD` 常量 (BASE, MIN, DYNAMIC_FACTOR)
  - 新增 `INTERACTION.RAY_DETECTION` 常量 (MIN_COS_ANGLE, DISTANCE_DIVISOR, SIZE_MULTIPLIER等)
  - 重构 `InteractionMath` 模块，添加 `getDynamicThreshold()` 和 `isZoomedInClose()`
  - 移除 `fediverse-interaction.js` 中冗余的 Raycaster 网格检测逻辑
  - 统一使用 `InteractionMath.findClosestInstance()` 作为唯一交互入口
  - 扩展单元测试 `tests/unit/interaction-math.test.js`

### 阶段 B（3-5 天）
- [x] LabelLayout 网格分桶实现与性能对比 ✅ (2026-01-16)
  - 实现 Spatial Hashing (Grid Size 100)
  - 性能提升 >10x (20k items: 185ms -> 16ms)
  - 添加基准测试 `tests/unit/label-layout.test.js`
- [x] `fediverse_final.json` Worker 解析 ✅ (2026-01-16)
  - 创建 `src/js/workers/data-loader.worker.js`
  - 修改 `fediverse.js` 使用 Worker 并包含回退机制
  - 避免主线程解析 JSON 阻塞 UI
- [x] `AssetManager` 增加缓存回收 ✅ (2026-01-16)
  - 实现 LRU 缓存策略 (默认 Max 50)
  - 自动调用 `texture.dispose()` 释放 GPU 内存
  - 更新单元测试 `tests/unit/asset-manager.test.js` 覆盖淘汰逻辑

### 阶段 C（1 周）
- [x] 全局状态依赖的显式化 (部分完成) ✅ (2026-01-16)
  - 创建 `src/js/core/state.js` 替代 `globals.js`
  - 重构 `main.js` 初始化并填充 `state`
  - 重构 `fediverse-interaction.js` 和 `fediverse.js` 使用 `state`
  - 使用 `Object.defineProperty` 锁定 `window.state` 别名，防止意外重写
- [x] 性能观测工具接入 ✅ (2026-01-16)
  - 创建 `src/js/utils/perf-monitor.js`
  - 显示 FPS, 内存使用 (Chrome), Draw Calls, Geometry count
  - 添加 `destroy()` 方法支持清理
- [x] 完善测试与回归基线 ✅ (2026-01-16)
  - 增加 `tests/unit/data-loader.test.js` 验证 Worker/Fallback 逻辑
  - 增加 `tests/unit/math.test.js` 覆盖核心数学工具函数
  - 更新 `tests/runner.html` 注册所有新测试

### 阶段 D (优化与清理)
- [x] 资源生命周期闭环 ✅ (2026-01-16)
  - 实现 `AssetManager.retain/release`
  - 实现 `disposeFediverse()`: 释放纹理、销毁 Geometry/Material、清理全局引用
  - 实现 `detachLegacyMarker()`: 修复 DOM 节点残留与崩溃问题
- [x] 统一常量与校验 ✅ (2026-01-16)
  - 集中 `DATA_LOAD_SCALE` 与主要实例配置 (`MAJOR_INSTANCE_COLORS`) 到 `constants.js`
  - 实现 Worker 与 Fallback 路径的数据校验逻辑一致性 (检查 `position` 数值与 `domain` 字符串)
- [x] 交互与 UI 清理 ✅ (2026-01-16)
  - 实现 `destroyFediverseInteraction()`: 移除全局事件监听
  - 实现 `destroyFediverseLabels()`: 移除 Label 画布与 Resize 监听
  - 实现 `destroyMinimap()`: 移除 Minimap 交互监听
  - 在 `pagehide` 事件中编排统一清理流程
- [x] Minimap 深度清理与生命周期加固 ✅ (2026-01-16)
  - 重构事件处理为具名函数，确保可移除
  - 增加 `isDestroyed` 标志位，防止异步 fetch 回调在销毁后重新挂载监听器
  - 扩展单元测试覆盖 window 级监听器移除验证
- [x] 全局状态收敛 ✅ (2026-01-16)
  - 完成核心模块 (`galaxy.js`, `fediverse-solarsystem.js`, `planet-model.js`, `sun.js`, `skybox.js`) 的 `window.*` -> `state.*` 迁移
  - 修复 `sun.js` 中 `AssetManager` 和 `maxAniso` 的引用错误

## 四、下一步建议 (Phase E)
- [ ] AssetManager 引用计数 (Retain/Release) 机制
- [ ] 纹理图集 (Texture Atlas) 优化小图标渲染
- [ ] 迁移剩余的 `window.*` 依赖到 `state`

---

## 四、风险与注意事项

- **架构改动较多**：全局状态的收敛需分阶段进行，避免引入新耦合。
- **性能优化需基准对比**：每项优化必须对比关键场景帧率与交互延迟。
- **网络受限环境**：资源加载策略必须确保无外网依赖时仍能运行。

---

## 五、关联文档

- `docs/architecture/coordinate-systems.md`
- `docs/postmortems/EXECUTIVE-SUMMARY.md`
- `docs/plans/improvements.md`
- `docs/plans/modernization.md`

---

## 六、代码质量评估与改进点（Review）

> 本节为对当前代码库的质量评估与改进建议，基于 `src/js/core/*`、`src/js/utils/*`、`src/js/workers/*`、`scripts/fediverse-processor/*` 的抽样审阅。

### 综合评价 (2026-01-16 更新)
- **整体质量**：优秀（经过整改，核心模块边界清晰，常量集中，资源与监听器具备完整生命周期管理）。
- **可维护性**：良好（Worker 校验逻辑与常量复用性增强，减少了隐式依赖）。
- **稳定性**：优秀（Worker/Fallback 路径均具备强数据校验，防止渲染层崩溃）。
- **性能可控性**：优秀（资源回收机制已落地，避免长期运行内存泄漏）。

### 已解决问题（Status Update）
1. **✅ 资源生命周期未闭环**
   - 修复：实现 `disposeFediverse()`，涵盖纹理释放、模型销毁、全局引用清理。
   - 修复：`detachLegacyMarker()` 解决了 DOM 节点残留问题。

2. **✅ 数据加载路径的健壮性不足**
   - 修复：Worker 与 Fallback 均增加了严格的数据结构校验（`position` 数值 + `domain` 字符串），并统一了错误处理行为。

3. **✅ 全局状态与模块边界仍混杂**
   - 优化：主要常量与配置（包括 Major Instance 列表）已统一至 `constants.js`。

4. **✅ 事件与状态清理缺乏统一策略**
   - 修复：`destroyFediverseInteraction`, `destroyFediverseLabels`, `destroyMinimap` 已实现并挂载至 `pagehide` 事件，确保页面卸载或重载时清理干净。

5. **✅ 可测试性仍存在盲区**
   - 优化：增加 Worker/Fallback 行为一致性的单元测试。

### 建议改进（后续迭代）
- **✅ Minimap 深度清理** (2026-01-16)
   - 重构 `minimap.js` 使用具名函数处理事件监听。
   - 更新 `destroyMinimap` 以正确移除所有相关监听器。
   - 增加 `tests/unit/minimap.test.js` 验证清理逻辑。
- **全局状态进一步收敛**：继续将 `window.*` 依赖迁移至 `state` 对象。 (2026-01-16: 已完成 core 核心模块 `galaxy.js`, `fediverse-solarsystem.js`, `planet-model.js`, `sun.js`, `skybox.js` 的迁移)

---

