# 尸检报告：universe.glb 玻璃外壳不可见/内部被遮挡的长时间排查

**日期**: 2026-01-17 ~ 2026-01-18  
**影响范围**: `universe.glb`（mastodon.social 专属行星）  
**严重程度**: 高（视觉核心资产异常）  
**状态**: ✅ 已解决

---

## 问题描述

在项目中加载 `universe.glb` 时，出现两个互斥的极端表现：

1. **外壳不透明，内部不可见**  
2. **内部可见，但玻璃外壳完全看不到**

同一模型在 https://gltf-viewer.donmccurdy.com 中显示正常，说明 GLB 本身正确。

---

## 影响

- 核心展示模型视觉失败，无法呈现"玻璃外壳 + 内部结构"的设计意图
- 多次调参导致结果反复，不可预测
- 排查耗时近 48 小时（跨两个调试阶段）

---

## 调试过程摘要（关键发现）

### 第一阶段：外壳不透明，内部不可见

1. **透明排序必须开启**
   - `renderer.sortObjects=false` 会导致透明层级错乱，外壳遮挡内部
   - 开启后内部可见

2. **壳体材质参数与真实透明不一致**
   - `Mat_Nucleo` / `Mat_Orb` 标记 `transparent=true`，但 `opacity=1`
   - 导致"透明材质的完全不透明"

3. **渲染状态被每帧覆盖**
   - GUI/控制台改 `toneMappingExposure`、`envMapIntensity` 等会被 `applyPlanetRenderConfig` 每帧重置
   - 导致"调参无效"的假象

### 第二阶段：内部可见，但外壳消失

4. **材质名称带 `.001` 后缀导致匹配失败**
   - GLB 导出时材质名变为 `Mat_Nucleo.001`、`Mat_Orb.001`
   - 使用 `Set.has()` 精确匹配失败
   - **修复**: 改用 `startsWith()` 模糊匹配

5. **`.001` 后缀的 mesh 被错误隐藏**
   - 隐藏重复对象的逻辑 `if (matName.includes(".001"))` 误杀了壳体
   - **修复**: 增加 `isShellMaterial` 白名单检查

6. **多处代码重复处理材质，互相覆盖**
   - `processLoadedScene` → 第一次处理
   - `setPlanetMesh` 隐藏 duplicates → 第二次
   - `planet-material-overrides.mjs` → 第三次覆盖
   - 后续 traverse 材质处理 → 第四次覆盖
   - **关键发现**: 控制台脚本有效是因为在所有处理之后执行

7. **`materialKind: "standard"` 不会升级到 Physical**
   - `shouldUpgradeToPhysical()` 要求 `materialKind === "physical"`
   - 导致 `transmission`/`ior` 等玻璃属性不生效
   - Three.js r158 对 transmission 需要特殊渲染设置，否则 shader 编译失败

8. **浏览器缓存导致代码修改不生效**
   - 修改 `.mjs` 文件后，浏览器仍使用缓存版本
   - 日志显示旧代码仍在执行

---

## 根本原因分析

### 1) 材质命名不一致
GLB 导出时自动添加 `.001` 后缀，代码中精确匹配失败。

### 2) 代码架构问题：多处修改同一对象
```
加载流程：
GLTFLoader → processLoadedScene → clone → setPlanetMesh → overrides → traverse
                ↓                              ↓              ↓           ↓
           处理材质1                      隐藏mesh      覆盖材质2    处理材质3
```
每个阶段都可能覆盖前一阶段的设置，且没有明确的"最终状态"保证。

### 3) 透明渲染的多重依赖
正确显示玻璃外壳需要**同时满足**：
- `renderer.sortObjects = true`
- `transparent = true`
- `opacity < 1`（如 0.25）
- `depthWrite = false`
- `renderOrder` 正确设置
- mesh `visible = true`（未被隐藏逻辑误杀）

任一条件失败都会导致不可见。

### 4) 控制台脚本 vs 代码的时序差异
控制台脚本在**渲染循环已开始**后执行，绕过了所有初始化阶段的覆盖。
代码中的设置在初始化阶段被后续代码覆盖。

---

## 为什么排查耗时近 48 小时

1. **问题表现为"互斥两极"**
   - 调一个参数解决问题A，却引发问题B
   - 难以建立因果关系

2. **多处代码重复处理，覆盖链路复杂**
   - 4+ 个地方修改同一材质
   - 难以追踪"最终生效的是哪个设置"

3. **材质名称差异隐蔽**
   - `Mat_Nucleo` vs `Mat_Nucleo.001` 肉眼容易忽略
   - 精确匹配 `Set.has()` 静默失败，无错误日志

4. **隐藏逻辑误杀无警告**
   - `.001` mesh 被隐藏时没有日志提示
   - 看起来像"材质问题"而非"可见性问题"

5. **浏览器缓存**
   - 代码已修改但旧版本仍在执行
   - 日志显示旧逻辑，误导调试方向

6. **控制台有效但代码无效**
   - 最具迷惑性：同样的设置，控制台能工作，代码不行
   - 需要意识到"时序/覆盖"问题

7. **缺少"材质状态快照"工具**
   - 难以对比"设置前 vs 设置后"的材质属性
   - 难以追踪"谁最后修改了这个属性"

---

## 有效的调试手段（这次证实有效）

### 定位问题
- **控制台脚本验证** - 先用脚本确认"参数正确时效果正常"
- **添加详细日志** - 在每个处理阶段打印材质状态
- **打印材质名称** - 发现 `.001` 后缀问题
- **打印 visible 状态** - 发现 mesh 被隐藏

### 验证修复
- **在函数末尾应用设置** - 确保是"最后执行"
- **禁用 overrides 模块** - 验证覆盖问题
- **强制刷新（Ctrl+Shift+R）** - 排除缓存

### 诊断代码（可复用）
```javascript
// 检查所有壳体材质状态
window.starModel._planetMesh.traverse((obj) => {
  if (!obj.isMesh || !obj.material) return;
  const m = obj.material;
  if (m.name.includes("Nucleo") || m.name.includes("Orb")) {
    console.log(m.name, {
      visible: obj.visible,
      transparent: m.transparent,
      opacity: m.opacity,
      depthWrite: m.depthWrite,
      renderOrder: obj.renderOrder,
    });
  }
});
```

---

## 推荐的未来调试工具与思路

### 工具建设

1. **材质状态追踪器**
   - 在每个处理阶段记录材质属性快照
   - 支持 diff 对比"哪个阶段改了什么"

2. **"最终设置"钩子**
   - 提供 `onPlanetReady(callback)` 钩子
   - 确保在所有初始化完成后执行

3. **可见性检查工具**
   - 一键列出所有 `visible=false` 的 mesh
   - 高亮被隐藏的对象

4. **材质名称模糊匹配工具**
   - 自动处理 `.001`/`.002` 后缀
   - 或在加载时标准化材质名称

### 调试思路（按顺序）

1. **先用控制台脚本验证参数有效性**
   - 如果脚本有效但代码无效 → 覆盖问题
   
2. **检查材质名称是否精确匹配**
   - 打印实际名称，注意后缀
   
3. **检查 mesh 可见性链路**
   - `obj.visible` + 所有父节点的 `visible`
   
4. **追踪设置覆盖**
   - 在关键位置添加日志
   - 确认"最终生效的值"
   
5. **强制刷新排除缓存**
   - 每次修改后 Ctrl+Shift+R

---

## 经验教训

1. **材质名称匹配用 `startsWith()` 而非精确匹配**
   - GLB 导出可能添加后缀

2. **多处修改同一对象时，明确"最终设置点"**
   - 在流程最末尾应用关键设置
   - 或使用标志位避免重复处理

3. **"控制台有效但代码无效"= 覆盖问题**
   - 检查执行顺序和时机

4. **隐藏逻辑需要白名单保护**
   - 批量隐藏前检查是否误杀关键对象

5. **透明渲染需要多条件同时满足**
   - 建立 checklist，逐一验证

6. **每次修改后强制刷新**
   - 浏览器缓存是常见陷阱

---

## 最终解决方案

在 `setPlanetMesh` 函数**最末尾**，即 `this._planetMesh = planetInstance` 之后，应用玻璃效果：

```javascript
// Apply universe.glb shell glass effect as FINAL step
if (modelName && modelName.includes("universe")) {
  const shellNames = new Set(["Mat_Nucleo", "Mat_Orb"]);
  this._planetMesh.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (shellNames.has(m.name)) {
        m.transparent = true;
        m.opacity = 0.25;
        m.depthWrite = false;
        m.depthTest = true;
        m.side = THREE.DoubleSide;
        obj.renderOrder = 10;
        m.needsUpdate = true;
      }
    });
  });
}
```

同时确保：
- `renderer.sortObjects = true`（在 main.js 中）
- 壳体材质 mesh 未被隐藏逻辑误杀
