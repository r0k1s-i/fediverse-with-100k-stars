# 代码深度分析与优化整改计划

**更新日期**: 2026-01-16
**状态**: ✅ 阶段 A 完成
**当前阶段**: 阶段 B - 性能与资源优化
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
1. **离线 Draco 解码器策略**
   - 将 Draco 解码器放入本地资源目录，并增加本地优先加载逻辑，避免外部网络依赖。
   - 需要更新 `src/js/core/planet-model.js` 中 `setDecoderPath()` 的策略。

2. **统一阈值与配置源**
   - 将 `markerThreshold`、交互阈值、缩放阈值统一迁移到 `src/js/core/constants.js`，避免逻辑漂移。

3. **交互路径收敛**
   - 统一 `Raycaster` 与 `InteractionMath.findClosestInstance()` 的入口，避免双重判定与交互抖动。

### P1：性能与资源优化
4. **LabelLayout 空间分桶**
   - 使用网格分桶或简单 QuadTree，降低 `LabelLayout` 碰撞检测到近似 O(n)。

5. **数据加载拆分与 Worker 化**
   - `fediverse_final.json` 体积较大，建议使用 Web Worker 做解析并返回结构化数据。
   - 或在构建阶段切分为多个区块以支持渐进加载。

6. **纹理缓存释放策略**
   - `AssetManager` 增加 `dispose()` 与 LRU 淘汰策略，减少 GPU 内存滞留。

### P2：可维护性与工程化
7. **全局状态依赖的显式化**
   - 核心模块通过集中 `state` 对象进行读写，减少 `window.*` 的隐式依赖。

8. **性能观测与诊断工具**
   - 增加可切换的性能统计面板（加载时间、帧耗时、纹理占用）。

9. **测试分层与可重复性**
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
- [ ] LabelLayout 网格分桶实现与性能对比
- [ ] `fediverse_final.json` Worker 解析
- [ ] `AssetManager` 增加缓存回收

### 阶段 C（1 周）
- [ ] 状态管理收敛（引入 `state` 或 `context`）
- [ ] 性能观测工具接入
- [ ] 完善测试与回归基线

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

