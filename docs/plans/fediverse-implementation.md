# Fediverse 联邦宇宙可视化 - 实施计划

**更新日期**: 2026-01-16
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

- **更新时间**: 2026-01-16
- **当前阶段**: GLB 行星模型渲染一致性校验（Sketchfab 对齐）
- **下一步行动**:
  - [ ] 复查 `scene.background` 与 `scene.environment` 分离策略
  - [ ] 验证 `toneMappingExposure` 与环境贴图强度匹配
  - [ ] 仅在需要时对 emissive 做最小化覆盖

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

## 🚀 可选后续优化

- [ ] Phase 8: 视觉增强（搜索、过滤、统计面板）
- [ ] Phase 9: 实时更新支持
- [x] Three.js 升级到现代版本
- [ ] 添加构建工具 (Vite/Rollup)
- [ ] TypeScript 迁移
