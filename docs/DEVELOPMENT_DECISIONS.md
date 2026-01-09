# 开发决策记录

**项目**: Fediverse Universe Visualization
**最后更新**: 2025-01-09

---

## 已确认的技术决策

### 1. 颜色映射方案

**决策**: 混合方案（对数映射 + 纪元加权）

**实现细节**:
- 基础色相：创建时间 → 240°(蓝) 到 0°(红) 的对数映射
- 纪元修正：早期实例(-20°偏红)，新实例(+20°偏蓝)
- 亮度：活跃度 (30%-75%)
- 饱和度：用户规模 (40%-90%)
- 微调：域名哈希 ±30°

**代码状态**: 待实现

---

### 2. 空间布局算法

**决策**: 三体系统 + 多星系团混合

**实现细节**:
- **顶层**: 66种软件 = 66个独立星系
- **Mastodon特殊处理**: 前3大实例形成等边三角形（三恒星系统）
  - mastodon.social: (0, 0, 0)
  - pawoo.net: (8000, 0, 0)  
  - mastodon.cloud: (4000, 6928, 0)
- **其他星系**: 最大实例为中心，其他实例轨道分布
- **距离计算**: 500 + log10(users+1)*300 + rank*50
- **角度**: 域名哈希 * 2π
- **倾角**: ±30° (基于域名+软件哈希)

**代码状态**: 待实现

---

### 3. 实例创建时间获取

**决策**: 多级fallback策略

**逻辑**:
```
IF first_seen_at > 2021-03-21:
    使用 first_seen_at
ELSE:
    尝试查询 https://{domain}/api/v1/instance
    获取 contact.account.created_at
    IF 失败:
        fallback 到 first_seen_at
```

**代码状态**: 待实现

---

### 4. 交互系统

**决策**: WebGL拾取 + Canvas标签 + Tooltip

**架构**:
- Layer 1: 40k WebGL粒子（全部可点击，Raycaster）
- Layer 2: Canvas 2D标签（显示附近300个重要实例）
- Layer 3: 单个Tooltip DOM（鼠标悬停）
- Layer 4: 单个详情面板DOM（点击后显示）

**性能目标**: 60fps @ 4ms/frame

**代码状态**: 待实现

---

### 5. 数据获取策略

**API**: https://api.fedidb.org/v1/servers
**限流**: 3次/分钟（每3次请求后等待60秒）
**缓存**: localStorage，24小时过期

**代码状态**: 待实现

---

## 开发优先级

### 立即开始（Phase 1-3）

1. **数据获取脚本** - 高优先级
   - [ ] FediDB API完整数据抓取
   - [ ] 实例创建时间获取（多级fallback）
   - [ ] 本地缓存机制
   - [ ] 数据清洗和验证

2. **颜色映射系统** - 高优先级
   - [ ] 混合年龄映射函数
   - [ ] HSL → RGB 转换
   - [ ] spectralIndex 兼容现有shader
   - [ ] 颜色预览HTML生成

3. **位置聚类算法** - 高优先级
   - [ ] 三恒星位置计算
   - [ ] 星系中心生成（66种软件）
   - [ ] 轨道位置计算
   - [ ] 碰撞检测和最小距离
   - [ ] RA/DEC/Distance 转换

### 后续阶段（Phase 4-9）

4. 数据转换管线
5. WebGL交互系统
6. Canvas标签渲染
7. 性能优化
8. 视觉增强
9. 实时更新（可选）

---

## 参数配置

### 时间映射

```javascript
const CONFIG = {
    GENESIS_DATE: '2016-11-23T00:00:00.000Z',
    FEDIDB_START: '2021-03-21T00:00:00.000Z',
    
    // 纪元修正
    ERA_EARLY_CUTOFF: '2019-01-01',  // 早于此为"早期"
    ERA_NEW_CUTOFF: '2024-01-01',     // 晚于此为"新"
    ERA_EARLY_OFFSET: -20,            // 度
    ERA_NEW_OFFSET: +20,              // 度
    
    // 色相范围
    HUE_MIN: 0,    // 红色（老）
    HUE_MAX: 240,  // 蓝色（新）
    
    // 亮度范围
    LIGHTNESS_MIN: 30,  // %
    LIGHTNESS_MAX: 75,  // %
    
    // 饱和度范围
    SATURATION_MIN: 40,  // %
    SATURATION_MAX: 90,  // %
};
```

### 空间布局

```javascript
const SPACE_CONFIG = {
    // 三恒星系统
    THREE_STARS: [
        { domain: 'mastodon.social', pos: [0, 0, 0] },
        { domain: 'pawoo.net', pos: [8000, 0, 0] },
        { domain: 'mastodon.cloud', pos: [4000, 6928, 0] }
    ],
    
    // 距离计算
    DISTANCE_BASE: 500,
    DISTANCE_LOG_MULTIPLIER: 300,
    DISTANCE_RANK_MULTIPLIER: 50,
    
    // 星系半径范围
    GALAXY_RADIUS_MIN: 2000,
    GALAXY_RADIUS_MAX: 8000,
    
    // 倾角范围
    INCLINATION_RANGE: 30,  // ±30度
    
    // 最小间距（碰撞检测）
    MIN_DISTANCE: 10,
};
```

### 交互系统

```javascript
const INTERACTION_CONFIG = {
    // Canvas标签
    MAX_VISIBLE_LABELS: 300,
    LABEL_FONT_SIZE_MIN: 10,
    LABEL_FONT_SIZE_MAX: 16,
    
    // LOD距离阈值
    LOD_CLOSE: 100,
    LOD_MEDIUM: 500,
    LOD_FAR: 2000,
    
    // 性能
    TARGET_FPS: 60,
    FRAME_BUDGET_MS: 4,
};
```

---

## 调试模式

开发过程中需要可视化调试工具：

1. **颜色预览器** - HTML页面展示100个样例实例的颜色
2. **位置预览器** - 2D Canvas展示星系布局俯视图
3. **性能监控** - Chrome DevTools集成，实时FPS/帧时间

**代码状态**: 待实现

---

## 测试数据集

开发阶段使用小数据集快速迭代：

- **Mini集**: 100个实例（覆盖主要软件类型）
- **Medium集**: 1000个实例
- **Full集**: 40000个实例

**代码状态**: 待生成

---

## 文件结构

```
100k-Star-Challenge/
├── docs/
│   ├── DEVELOPMENT_DECISIONS.md       (本文件)
│   ├── FEDIVERSE_IMPLEMENTATION_PLAN.md
│   └── API_REFERENCE.md               (待创建)
├── scripts/
│   ├── fetch-fediverse-data.js        (待创建)
│   ├── calculate-colors.js            (待创建)
│   ├── calculate-positions.js         (待创建)
│   ├── generate-star-data.js          (待创建)
│   └── preview-colors.html            (待创建)
├── data/
│   ├── fediverse_raw.json             (原始API数据)
│   ├── fediverse_processed.json       (处理后)
│   └── fediverse_stars.json           (最终格式)
└── index_files/
    ├── fediverse_stars.json           (部署用)
    └── fediverse-*.js                 (新增模块)
```

---

## 待解决的问题

### 需要调试的参数

1. **三恒星三角形边长**: 当前8000单位是否合适？
2. **星系间距**: 不同软件星系的间隔距离
3. **Canvas标签数量**: 300个是否最优？需要性能测试
4. **色相扰动范围**: ±30度是否足够区分同软件实例？

**决策方式**: 实现后生成预览，根据视觉效果调整

---

## 开发规范

### Commit规范

```
feat: 新功能
fix: 修复
refactor: 重构
perf: 性能优化
docs: 文档
test: 测试
chore: 构建/工具
```

### 代码风格

- 遵循现有项目的全局变量风格
- 函数使用驼峰命名
- 常量使用大写下划线
- 注释：中英文混合（关键逻辑用中文解释）

---

## 下一步行动

**当前阶段**: Phase 1 - 数据获取

**立即执行**:
1. 创建 `scripts/fetch-fediverse-data.js`
2. 实现API抓取逻辑（含限流）
3. 实现创建时间获取（多级fallback）
4. 测试：抓取100个实例验证

**负责人**: AI助手
**预期产出**: `data/fediverse_raw.json`

