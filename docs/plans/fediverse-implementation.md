# Fediverse 联邦宇宙可视化 - 实施计划

**更新日期**: 2026-01-18
**项目**: fediverse-with-100k-stars → Fediverse Visualization
**状态**: ✅ 核心功能完成

---

## ✅ 项目完成状态

### 已完成的核心功能

| Phase | 名称 | 状态 | 说明 |
|-------|------|------|------|
| 1 | 数据获取 | ✅ 完成 | FediDB API 抓取，40k+ 实例 |
| 2 | 颜色系统 | ✅ 完成 | 38个测试全部通过 |
| 3 | 位置聚类 | ✅ 完成 | 21个测试全部通过 |
| 4 | 数据转换 | ✅ 完成 | CLI 工具，支持管道 |
| 5 | WebGL交互 | ✅ 完成 | 4k+ 点击可交互 |
| 6 | Canvas标签 | ✅ 完成 | 智能避让算法 |
| 7 | 目录重构 | ✅ 完成 | 现代前端最佳实践 |
| 8 | 现代化升级 | ✅ 完成 | 升级至 Three.js r158, ES Modules |

---

## 当前状态

- **更新时间**: 2026-01-18
- **当前阶段**: 近视距 GLB 渲染加载与冗余逻辑梳理
- **下一步行动**:
  - [x] 输出近视距 GLB 模型加载/渲染冗余问题整改意见
  - [x] 新增代码深度分析与优化整改计划
  - [x] 补充代码质量评估与改进建议（codebase-optimization-review.md）
  - [x] 修复相机 target 初始化缺失导致的启动崩溃
  - [x] 统一生产/开发使用 CDN 数据源
  - [x] 移除 data preload 以避免未使用预加载警告
  - [x] 完成黑屏排查并清理临时日志
  - [x] 初始化 camera.position.target.x/y 防止 NaN 黑屏
  - [x] 为 planetScene 设置独立曝光/色调映射配置
  - [ ] 在项目中对比 Sketchfab 角度/曝光截图
  - [ ] 验证 `renderer.sortObjects=false` 是否导致透明排序错误
  - [ ] 验证强制透明时 `depthWrite` 是否仍为 true 造成遮挡
  - [ ] 复核 `.001` 重复节点命名变化是否导致隐藏逻辑失效
  - [x] 为 `Mat_Nucleo` / `Mat_Orb` 添加透明材质覆盖（TDD）
  - [x] planet render pass 启用透明排序（TDD）
  - [ ] 为 universe.glb 非壳体材质添加金属质感增强（TDD）
  - [x] 调整壳体玻璃透明度与透射强度以提升可见性（TDD）
  - [x] 为壳体增加轻度 emissive 提升玻璃可见性（TDD）
  - [x] 输出本轮调试复盘与工具/思路沉淀（postmortem）
  - [x] 加入顶置聚光灯以模拟王座座面光束
  - [x] 聚光灯仅对王座模型生效，并随模型旋转
  - [x] 为克隆后的行星模型保留 `modelName` 以便灯光匹配
  - [x] 固定王座聚光灯光圈大小（避免刷新后随机变化）
  - [x] 更新王座聚光灯强度/距离/高度参数
  - [x] 行星模型仅保留王座模型用于调试
  - [x] 行星场景环境光整体调暗
  - [x] 恢复全部行星模型随机加载
  - [x] 记录王座聚光灯失效问题的尸检报告（完整版）
  - [x] 移除未使用的 planet-render-config CLI 脚本
  - [x] 增加 Fediverse 点击/缩放日志（TDD）
  - [x] 修复相同实例点击不缩放（TDD）
  - [x] 点击缩放期间短暂忽略滚轮输入（TDD）
  - [x] 清理点击交互调试日志
  - [x] 通过 TWEEN.add 探针定位 “拉远 tween” 来源
  - [x] 发现 target.z 写入来自 zoomIn onUpdate（tween.update → onUpdate）
  - [x] 决定仅在 onComplete 同步 target.z（避免动画过程覆盖目标）
  - [x] 新增 zoomIn 动画期间不覆盖 target.z 的单元测试（TDD）
  - [x] 修正 zoomIn 测试全局变量泄漏（TDD）
  - [x] 移除 zoomIn 的 onUpdate target 同步（TDD）
  - [x] 记录本轮复现尝试与未复现现象
  - [x] 清理缩放追踪临时日志
  - [ ] 验证是否存在 wrap 之前创建的相机 tween（goToGridView/旧 tween）
  - [ ] 评估是否需要进一步降低 planetScene 灯光强度
  - [ ] 如仍偏平，考虑适度增强 AO/法线对比度
  - [x] 调整默认视距与初始交互体验
  - [ ] 排查近视距模型摩尔纹/闪烁原因
  - [ ] 排查切换星球后摩尔纹加重原因
  - [x] 阴影/深度偏差调优（bias/normalBias）
  - [x] 修复近视距星空背景消失
  - [x] 确认 HDR 反射环境贴图应用时机
  - [ ] 在 debug 流程中需用户确认后再提交代码
  - [x] 为 the_universe.glb 添加透明材质覆盖（不影响其他模型）
  - [x] 完成 the_universe 透明效果单元测试并等待审批
  - [x] the_universe 材质升级为 Physical 以提升透射
  - [x] the_universe 添加可见性护栏参数（提高不透明与自发光）
  - [x] 增加 the_universe 模型加载/边界调试日志
  - [x] 增加 the_universe 材质与可见性调试日志
  - [x] 为 the_universe 添加内部点光源提升可见性
  - [x] 提升 the_universe 内部点光源强度（高亮验证）
  - [x] 增加 the_universe 材质统计调试日志（材质类型/贴图/顶点色）

---

## 🏗️ 项目结构（已重构）

```
fediverse-with-100k-stars/
├── index.html                      # 主入口
├── src/
│   ├── js/
│   │   ├── core/                   # 30个核心模块
│   │   │   ├── main.js             # 核心初始化和动画循环
│   │   │   ├── galaxy.js           # 银河系生成
│   │   │   ├── fediverse.js        # Fediverse 渲染核心
│   │   │   ├── planet-model.js       # GLB行星模型加载器
│   │   │   ├── fediverse-interaction.js  # 交互系统
│   │   │   ├── fediverse-labels.js # Canvas 标签
│   │   │   ├── interaction-math.js # 交互数学计算
│   │   │   ├── label-layout.js     # 标签布局引擎
│   │   │   └── ...                 # 其他核心模块
│   │   └── lib/                    # 11个第三方库
│   │       ├── three.min.js        # Three.js r58
│   │       ├── jquery-1.7.1.min.js
│   │       └── ...
│   ├── css/
│   │   ├── style.css               # 主样式
│   │   └── fonts.css               # 字体定义
│   ├── shaders/                    # 16个 GLSL 着色器
│   │   ├── corona.fsh/vsh
│   │   ├── datastars.fsh/vsh
│   │   └── ...
│   └── assets/
│       ├── textures/               # 33个纹理文件
│       ├── audio/                  # 背景音乐
│       ├── fonts/                  # 字体文件
│       └── icons/                  # SVG 图标
├── data/
│   ├── fediverse_raw.json          # 原始 API 数据 (19MB)
│   ├── fediverse_final.json        # 处理后数据 (27MB)
│   └── stars_all.json              # 原始星体数据
├── scripts/
│   └── fediverse-processor/        # Golang 数据处理工具
│       ├── main.go
│       ├── cli.go
│       ├── colors.go               # 颜色算法
│       ├── positions.go            # 位置算法
│       ├── types.go
│       ├── colors_test.go          # 38个测试
│       ├── positions_test.go       # 21个测试
│       └── go.mod
├── AGENTS.md                       # 编码规范
├── README.md                       # 项目说明
└── .gitignore
```

---

## ✅ 已确认的技术决策

### 1. 颜色映射方案

**算法**: 混合方案（对数年龄映射 + 纪元加权 + 域名哈希扰动）

| 参数 | 值 | 说明 |
|------|-----|------|
| 创世日期 | 2016-11-23 | Fediverse诞生日 |
| 色相范围 | 0°-240° | 红→蓝 |
| 亮度范围 | 30%-75% | 僵尸→活跃 |
| 饱和度范围 | 40%-90% | 小→大实例 |
| 域名哈希扰动 | ±30° | 解决同颜色问题 |

### 2. 空间布局算法

**算法**: 三体系统 + 多星系团混合

- **顶层**: 66种软件类型 = 66个独立星系
- **Mastodon**: 前3大实例形成三恒星系统
- **其他星系**: 最大实例为中心，其他轨道分布

### 3. 交互系统

**四层架构**:
- Layer 4: DOM详情面板 (点击显示)
- Layer 3: Tooltip DOM (悬停显示)
- Layer 2: Canvas 2D标签 (附近300个)
- Layer 1: WebGL粒子 (40k全部可点击)

---

## 📊 性能指标

| 指标 | 结果 |
|------|------|
| 数据处理速度 | 0.128 毫秒 (80实例) |
| 预计40k实例 | ~64 毫秒 |
| 相比Node.js | 快 200-300 倍 |
| 目标帧率 | 60fps |
| 帧预算 | 4ms/frame |

---

## 🔧 运行项目

```bash
# 启动开发服务器
python3 -m http.server 8000
# 或
npx serve .

# 访问
open http://localhost:8000
```

### 数据处理（如需重新生成）

```bash
# 编译处理器
cd scripts/fediverse-processor
go build

# 处理数据
./fediverse-processor -input ../../data/fediverse_raw.json -output ../../data/fediverse_final.json -verbose

# 运行测试
go test -v
```

---

## 📝 更新日志

### 2026-01-17
- 🔍 **排查**: 点击缩放回拉中视距问题
  - **探针**: 通过 wrap `TWEEN.Tween` + `TWEEN.add` 捕获新建 tween，确认 `zoomIn` tween 仅负责拉近
  - **发现**: `target.z` 写入来自 `zoomIn` 的 `onUpdate` 同步，导致动画过程覆盖目标值
  - **修复**: 移除 `zoomIn` 的 `onUpdate` 同步，仅在 `onComplete` 同步 target
  - **测试**: 新增 `zoomIn` 单元测试，断言动画过程中不覆盖 `target.z`
  - **日志**: 增加 `window.__zoomDebug` 开关，覆盖 `zoomIn`/滚轮/minimap 追踪
  - **现象**: 以上改动后未能稳定复现“回拉到中视距”问题，进入观察期
  - **清理**: 移除临时缩放追踪日志，保留测试与修复
- 📝 **复盘**: 输出 `universe.glb` 玻璃外壳不可见/内部遮挡的调试事故分析报告

### 2026-01-15
- ✨ **功能**: 添加 GLB 行星模型渲染系统
  - 新建 `planet-model.js` 模块，支持加载和显示 GLB 模型
  - 使用 `kamistar.glb` 作为默认行星模型
  - 添加 8 个《小王子》主题的 GLB 行星资源
- 🐛 **修复**: 解决 GLB 模型近距离观看时的 Z-Fighting 闪烁问题
  - **根本原因**: 模型物理尺寸极小 (`7.35e-8` 光年)，GPU 浮点精度不足
  - **解决方案**: 将模型缩放至 `1.0` 光年，确保足够的深度缓冲精度
  - 实现 Layer 分离渲染 (Layer 1)，通过 `renderer.clearDepth()` 确保行星始终渲染在最上层
- ♻️ **重构**: 优化 `main.js` 渲染循环，支持双层渲染架构
- 💄 **视觉**: 优化行星模型材质质感
  - **问题**: GLB 模型默认渲染呈"塑料感"，缺乏金属光泽
  - **方案**:
    - 将星空盒 (Skybox) 纹理应用为 `planetScene` 的环境贴图 (Environment Map)
    - 调整材质参数：降低粗糙度 (roughness 0.4)，提升金属度 (metalness 0.6)
    - 确保 PBR 材质正确反射环境光，呈现"闪亮"效果
  - **高级渲染升级**:
    - 启用 `ACESFilmicToneMapping` 色调映射，提升动态范围，消除过曝
    - 设置 `SRGBColorSpace` 输出，确保颜色准确还原
    - 优化灯光布局：主光增强 (2.5) + 环境光减弱 (0.2) + 新增边缘光 (Rim Light, 1.5)
    - 增强环境贴图强度 (envMapIntensity 2.0)
    - 效果：大幅接近 Sketchfab 官方渲染效果，具有电影级质感
  - **材质保真修复**:
    - **回滚破坏性修改**: 移除对 `roughness` 和 `metalness` 的强制覆写
    - **原因**: 之前的强制赋值破坏了 GLB 模型自带的高精度 PBR 贴图（Roughness Map / Metalness Map）
    - **优化**: 仅对所有贴图类型（normal, ao, roughness 等）应用高质量过滤 (Anisotropy 16x)
    - **阴影系统**: 启用 PCFSoftShadowMap 软阴影，并为所有行星模型网格开启投影和接收阴影
  - **特定模型优化 (Lamplighter)**: 针对"点灯人"模型 (planet_329_lamplighter) 进行特殊材质调优：
      - 星球表面：粗糙度 0.08，金属度 0.2（模拟聚光灯反射和菲涅尔效应）
      - 灯泡：Emissive #FFFFAA, 强度 8.0（模拟过曝发光效果）

### 2026-01-16
- 📝 **讨论**: 对比 Sketchfab 与项目渲染差异，优先排查环境光与材质覆盖问题
  - 结论：优先使用独立的 PBR 环境贴图，避免星空背景作为反射源
  - 要点：保留 GLB 原始材质参数，仅做纹理过滤与必要的 emissive 最小覆盖
- 📝 **讨论**: 新增 `planet_325_the_king` 王座模型的渲染差异排查
- 🐛 **修复**: 固定王座聚光灯光圈大小，避免刷新后随模型缩放变化
- 🎨 **调优**: 按调试值更新王座聚光灯强度/距离/高度
- 🎨 **调优**: 行星模型仅保留王座版本用于调试
- 🎨 **调优**: 行星场景环境光整体调暗
- 🎨 **调优**: 恢复全部行星模型随机加载
  - 关注：现有多方向灯光 + ACES 曝光可能导致质感偏平/偏亮
  - 风险：`planet-model.js` 里按名称过滤 `chair`/`throne` 可能误删模型部件
  - 假设：若 occlusion 贴图存在但缺少 UV2，将导致 AO 不生效（模型显得“糊”）
- 📝 **讨论**: 近视距渲染问题排查
  - 关注：默认视距过远、近视距摩尔纹、星空背景消失、HDR 反射确认
  - 结论：默认视距改回 2000；HDR 反射需始终作用于 planetScene（曝光 0.35）
  - 参考：以提交 8b177cf 的视觉效果为基准
- 📝 **讨论**: 切换星球后摩尔纹加重
  - 现象：首次加载时正常，点击任意星球后摩尔纹加重并影响所有模型
  - 状态：当前在 772beed 回滚版本仍可复现
- 🛠️ **实现**: 恢复星空背景渲染与默认视距
  - 默认视距回调至 2000
  - 渲染阶段重新绘制 skybox
- 🛠️ **实现**: 修复 HDR 反射加载时机
  - Skybox 初始化移动到 renderer 创建之后
  - HDR 环境贴图稳定应用到 planetScene
- 🛠️ **实现**: 引入 planetShadowConfig 阴影调优
  - 新增 planet-shadow-config 工具库与 CLI
  - 设置 DirectionalLight 的 bias/normalBias/radius
- 🛠️ **实现**: 为 planetScene 引入独立曝光/色调映射配置
  - 新增 `planet-render-config` 库与 CLI（JSON 输入/输出）
  - 渲染阶段应用并恢复 renderer 状态，避免影响主场景
- 📝 **流程**: 约定调试阶段提交需用户显式确认
- 🛠️ **实现**: 新增顶置聚光灯配置并应用于 planetScene
  - 默认参数来自调试确认：强度 35、距离 14、角度 PI/22、penumbra 0.15、位置 y=1
- 🛠️ **实现**: 聚光灯仅对王座模型启用，并随模型矩阵更新
- 🛠️ **实现**: 克隆模型时保留 `modelName`，用于聚光灯匹配逻辑
- 📝 **复盘**: 新增王座聚光灯失效修复的尸检报告
- 🧹 **清理**: 删除未使用的 planet-render-config CLI 脚本

### 2026-01-13
- 🐛 **修复**: 优化星空盒（Skybox）纹理过滤设置，解决高分屏下的模糊问题
- 🎨 **资源**: 转换高清星空纹理为高质量 JPG 格式 (Q90)，减小体积 (12MB -> 1.8MB) 并作为默认高分辨率资源使用

### 2026-01-12
- 💄 **UI**: 优化实例详情标题显示，截断过长名称并添加 Tooltip，防止遮挡返回按钮
- 💄 **UI**: 优化近视距交互体验，近距离 hover 不再显示跟随鼠标的 Tooltip，关闭详情后当前实例名显示在左下角
- 🐛 **修复**: 增大近距离点击判定范围（10 → 60），改善移动端或触摸操作下的选中体验
- ✨ **优化**: 当相机近距离靠近 Fediverse 实例时（< 80 距离），自动渲染星球模型，无需点击即可预览，解决"只见标签不见星球"的问题
- ♻️ **重构**: 引入 `updateFediverseInteraction()` 并在主循环中调用，确保直接缩放（不移动鼠标）时也能正确触发自动渲染和交互状态更新
- 🐛 **修复**: 设置旧版标签（Legacy Markers）的 `pointer-events: none`，允许鼠标点击穿透标签触发背后的 WebGL 交互
- 🐛 **修复**: 隐藏默认显示的太阳模型（Sun），避免产生混淆，仅在点击具体 Fediverse 实例时动态显示星球模型
- 🐛 **修复**: 允许在未选择任何实例的情况下直接缩放并点击太阳 (Sol) 查看详情
- 🐛 **修复**: 修正 Gyroscope 类的世界坐标更新逻辑，解决中心星体位置不随旋转更新的问题
- ♻️ **现代化升级**: 完成 Three.js r158 迁移
  - 移除 `three-compat.js` 兼容层
  - 实现本地 `Gyroscope` 类
  - 迁移 `LensFlare` 到现代 Addon
  - 替换 `LinePieces` 为 `LineSegments`
  - 修复 `tween.js` 模块导出问题
  - 修复核心模块的 ES Module 导入
- ✨ **功能**: 优化星体垂线显示逻辑
  - 从"仅大实例显示"改为"随机挑选固定数量显示"
  - 避免大实例集中区域垂线过于密集
  - 实现 `pickRandomIndices` 数学工具函数
  - 同步星体垂线与同心圆波纹的显示逻辑
    - 统一可见视距阈值 (1900)
    - 统一淡入淡出起始点 (300)

### 2026-01-11
- ♻️ **目录重构**: 按现代前端最佳实践重组
  - 删除28个无用文件 (-6,041行代码)
  - 创建 `src/` 目录结构
  - 分离 `js/core/`、`js/lib/`、`shaders/`、`assets/`
  - 更新所有文件引用路径

### 2026-01-09
- ✅ Phase 6 Canvas标签渲染完成
- ✅ Phase 5 WebGL交互系统完成
- ✅ 性能优化：纯数学计算替代 Raycaster

### 之前
- ✅ Phase 1-4 数据处理管线完成
- ✅ 59个单元测试全部通过

---

## 🔬 universe.glb 渲染问题排查记录 (2026-01-17)

### 问题描述
mastodon.social 专属模型 (the_universe.glb → universe.glb) 无法正确渲染：
- 最初显示**纯黑色**
- 调整后显示**不透明巧克力色**
- 无法看到模型内部结构
- 无法看到旋转效果
- 在 https://gltf-viewer.donmccurdy.com/ 中加载效果正确

### ✅ 已确认的事实

| 项目 | 结论 |
|------|------|
| 模型加载 | ✅ 成功，GLTFLoader 正常解析 |
| 模型尺寸 | ✅ 正常 (maxDim ≈ 125-131) |
| 模型可见性 | ✅ `visible: true` |
| 材质类型 | ✅ MeshPhysicalMaterial (支持 clearcoat) |
| 材质数量 | ✅ 23个材质被正确识别 |
| 调试面板 | ✅ 材质修改生效 (`Applied to 23 materials`) |
| 透明材质 | ✅ Mat_Nucleo (opacity=0.73), Mat_Orb (opacity=0.66) 正确设为 transparent |
| GLB 扩展 | ✅ `KHR_materials_clearcoat` 扩展存在 |
| planetScene 渲染 | ✅ `renderer.render(planetScene, planetCamera)` 被调用 |

### ❌ 已排除的问题

| 排查方向 | 结果 |
|----------|------|
| 光照不足 | ❌ 增加内部点光源无效 |
| 材质类型错误 | ❌ 从 MeshBasic 换回 Standard/Physical 仍有问题 |
| depthWrite 错误 | ❌ 修正为 `!transparent` 无效 |
| planetCamera far 太小 | ❌ 从 100 改为 500 解决了相机裁剪问题 |
| 纹理丢失 | ❌ 模型本身无纹理 (baseColorTexture: None) |
| 环境贴图未加载 | ❌ HDR 环境贴图已应用 |
| 色调映射曝光 | ❌ 调整 exposure 有视觉变化但不解决问题 |

### ⚠️ 当前核心问题

1. **GLB 包含两套模型**:
   - 原始模型 (Node 0-23): 使用 material 0-4，包含 `alphaMode: BLEND` 透明材质
   - 副本模型 (Node 28-40, 名称含 `.001`): 使用 material 5-10，全部 `alphaMode: OPAQUE`

2. **Three.js 加载后名称变化**: 
   - GLB 中 `pPipe2.001` → Three.js 中 `pPipe2001` (点号被移除)

3. **隐藏副本尝试**:
   - 代码已添加隐藏 `.001` 节点逻辑
   - 日志显示 `Hidden duplicate objects: 25`
   - 但**视觉上无变化**

4. **强制透明尝试**:
   - 代码修改 planetScene 所有 mesh 材质为 `transparent=true, opacity=0.3`
   - 日志显示修改成功
   - 但**视觉上无变化**
5. **最新验证结论**:
   - 仅开启 `renderer.sortObjects=true` 即出现正确透明层级
   - `Mat_Nucleo` / `Mat_Orb` 需设为 `opacity<1` 且 `depthWrite=false` 才能看到内部

### ✅ 关键发现 (最新)

**Visibility 测试结果**:
- `👻 Hide ALL Meshes` → 模型**完全消失** ✅
- `👁️ Show ALL Meshes` → 模型**重新出现** ✅
- 共 25 个 mesh 被正确识别和控制

**结论**: 
- `obj.visible = false` **确实生效**
- 问题在于**隐藏了错误的对象**
- 我们的隐藏逻辑 (`name.endsWith("001") && !name.includes("_")`) 匹配到了 25 个对象
- 但这 25 个可能**不是**遮挡透明效果的对象

**Mesh 命名分析**:
```
原始 mesh (应保留):    polySurface1_Mat_Aro_0, pSphere2_Mat_Nucleo_0 等
副本 mesh (应隐藏):    polySurface1001, pSphere2001 等
```

### 🔍 下一步排查方向

1. **验证隐藏逻辑命中的是哪些 mesh**:
   - 打印被隐藏的 mesh 名称列表
   - 确认是否真的是 `.001` 副本

2. **检查原始/副本是否空间重叠**:
   - 如果副本在原始后面，隐藏副本不会有视觉变化
   - 需要检查两套模型的位置关系

3. **强制只保留透明材质的 mesh**:
   - 只显示 Mat_Nucleo 和 Mat_Orb 材质的 mesh
   - 隐藏所有其他 mesh 看效果

4. **检查 gltf-viewer 是否也加载了两套模型**:
   - 在外部 viewer 中检查场景层级
   - 对比 Three.js 加载结果
5. **透明深度写入**:
   - 强制透明时需同步设置 `depthWrite=false`
   - 否则透明壳体仍会遮挡内部结构

### 📁 本次修改的文件

| 文件 | 修改内容 |
|------|----------|
| `planet-model.js` | 添加 universe.glb 重复节点隐藏逻辑、材质调试日志 |
| `planet-material-overrides.mjs` | 禁用 universe.glb 材质覆盖、修复颜色赋值、保留纹理 |
| `main.js` | 增加 planetCamera.far、添加渲染通道调试日志 |
| `index.html` | 添加 lil-gui CDN 映射 |
| `debug/planet-debug-gui.js` | 新建实时调试面板 (G键切换) |

### 🛠️ 添加的调试工具

- **lil-gui 调试面板** (按 G 键显示/隐藏):
  - Renderer / HDR: 曝光、色调映射、环境贴图强度
  - Lighting: 方向光、环境光参数
  - Material Overrides: 金属度、粗糙度、透明度、自发光
  - 🔮 Force All Transparent: 强制所有材质透明
  - 🔍 Log All Materials: 输出所有材质详情
  - 👻 Hide ALL Meshes: 隐藏所有 mesh (验证 visibility 生效)
  - 👁️ Show ALL Meshes: 显示所有 mesh
  - 📋 Export Config: 导出当前配置

---

## 🚀 可选后续优化

- [ ] Phase 8: 视觉增强（搜索、过滤、统计面板）
- [ ] Phase 9: 实时更新支持
- [x] Three.js 升级到现代版本
- [ ] 添加构建工具 (Vite/Rollup)
- [ ] TypeScript 迁移
