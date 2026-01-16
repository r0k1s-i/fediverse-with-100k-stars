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
- [x] LabelLayout 网格分桶实现与性能对比 ✅ (2026-01-16)
  - 实现 Spatial Hashing (Grid Size 100)
  - 性能提升 >10x (20k items: 185ms -> 16ms)
  - 添加基准测试 `tests/unit/label-layout.test.js`
- [x] `fediverse_final.json` Worker 解析 ✅ (2026-01-16)
  - 创建 `src/js/workers/data-loader.worker.js`
  - 修改 `fediverse.js` 使用 Worker 并包含回退机制
  - 避免主线程解析 JSON 阻塞 UI
- [ ] `AssetManager` 增加缓存回收
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

## 四、下一步建议 (Phase D)
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

### 综合评价
- **整体质量**：中上（改动后模块边界更清晰、常量集中化、测试覆盖提升，但仍存在隐式依赖与生命周期管理不足）。
- **可维护性**：中等（`state` 统一了部分入口，但仍混用 `window.*` 与局部状态）。
- **稳定性**：中等偏上（Worker/Fallback 机制提升稳定性，但错误/数据校验不充分）。
- **性能可控性**：良好（LabelLayout 网格化与 Worker 解析显著优化，但资源回收尚未彻底闭环）。

### 主要问题（按严重度）
1. **资源生命周期未闭环**
   - `src/js/core/fediverse.js` 中多处 `retain()` 但缺少对应 `release()`，导致 `AssetManager` 的引用计数无法回收。
   - `src/js/core/asset-manager.js` 虽有 LRU/引用计数，但调用方未形成统一释放策略，潜在 GPU 内存泄漏风险。

2. **数据加载路径的健壮性不足**
   - `src/js/workers/data-loader.worker.js` 假设数据为数组且含 `position`，缺少结构校验与异常上报细节。
   - `src/js/core/fediverse.js` 的 Worker/Fallback 都重复内置 `SCALE_FACTOR = 5`，缺少统一常量来源，变更风险较高。

3. **全局状态与模块边界仍混杂**
   - `src/js/core/main.js`、`src/js/core/fediverse-interaction.js` 中仍访问 `window.*` 或隐式依赖 DOM/全局函数，影响可测试性与复用。
   - 同一职责分散在多个模块（如交互阈值与可见性策略分散在 core/const、interaction、fediverse 内），维护成本偏高。

4. **事件与状态清理缺乏统一策略**
   - `initFediverseInteraction()` 为全局监听注册入口，但无对应解除机制，若未来需要热重载或重新初始化，会造成重复监听或泄漏。
   - 一些动画/缓动对象缺少销毁逻辑（例如 `TWEEN` 全局推进与对象生命周期分离）。

5. **可测试性仍存在盲区**
   - 交互/渲染逻辑仍大量依赖 DOM 与 WebGL 环境，缺少对关键交互路径的纯函数测试替代层。
   - Worker 解析、数据校验、异常分支等逻辑测试覆盖不足。

### 建议改进（可落地项）
- **资源回收闭环**：为各纹理/模型建立显式 `retain/release` 调用契约，并在场景切换或卸载时集中释放。
- **常量与校验统一**：将 `SCALE_FACTOR`、交互阈值等核心数值集中至 `constants.js` 并在 Worker 与主线程复用。
- **数据校验与错误日志**：Worker 返回时附带简单校验（数组/字段存在性），并记录异常输入示例以便复盘。
- **清理接口标准化**：为输入监听、TWEEN/动画对象、LabelLayout 等提供 `dispose()` / `destroy()` 规范入口。
- **测试分层完善**：为交互与数据路径新增纯函数层测试，并引入 Worker/fallback 分支覆盖。

### 复盘与改进（流程层）
- **问题**：本次 review 未能发现 `camera.position.target` 未初始化导致的运行时崩溃，说明审查过程缺少“最小启动路径”验证与关键初始化链路的检查。
- **原因**：过度关注性能/结构问题，忽略了关键运行时依赖（`camera.position.target`）是否在主循环前完成初始化。
- **改进动作**：
  - 增加“启动自检清单”，包含：相机/场景/状态对象关键字段是否在 `animate()` 前完成初始化。
  - 对核心循环增加轻量防御性检查（例如 `camera.position.target` 缺失时的兜底初始化）。
  - 将“可运行性”验证提升为 review 的第一优先级，与性能、结构并列。
  - 覆盖 `camera.position.target.x/y` 初始化，避免 `NaN` 传播导致渲染全黑。

### 环境一致性风险（新增）
- **问题**：生产与开发都强制走 CDN 数据源，任何 CDN 不可用/阻断会导致首页黑屏（数据加载失败）。
- **影响**：运行环境单点故障，且无法通过本地数据回退应急。
- **建议**：
  - 明确运行依赖（CDN 必达）并在文档标注“无本地数据”策略。
  - 在加载失败时给出明确 UI 提示与可重试入口，避免“黑屏无反馈”体验。
  - 加入详细加载日志或埋点，便于定位 CDN 失败原因（CORS/超时/解析失败）。
