# Fediverse 联邦宇宙可视化 - 实施计划

**更新日期**: 2025-01-09
**项目**: 100k-Star-Challenge → Fediverse Universe Visualization

---

## ✅ 已确认的技术决策

### 1. 颜色映射方案

**最终决策**: 混合方案（对数年龄映射 + 纪元加权 + 域名哈希扰动）

**核心理念**: 模拟真实恒星物理，用"温度/年龄"决定颜色
- **年轻实例** → 蓝白色（高温蓝星）
- **年老实例** → 红橙色（冷却红星）
- **活跃实例** → 高亮度
- **僵尸实例** → 低亮度

**实现细节**:

```javascript
function calculateInstanceColor(instance) {
    const createdAt = instance.creation_time?.created_at || instance.first_seen_at;
    const date = new Date(createdAt);
    const NOW = new Date();
    
    // 1. 对数年龄映射（解决线性映射颜色分布不均问题）
    const ageMs = NOW - date;
    const maxAgeMs = NOW - new Date('2016-11-23'); // Fediverse创世日
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    const maxAgeDays = maxAgeMs / (24 * 60 * 60 * 1000);
    const logAge = Math.log10(ageDays + 1);
    const logMaxAge = Math.log10(maxAgeDays + 1);
    const ageRatio = logAge / logMaxAge; // 0-1
    
    // 2. 基础色相（240蓝 → 0红）
    const baseHue = 240 - ageRatio * 240;
    
    // 3. 纪元修正
    let eraOffset = 0;
    if (date < new Date('2019-01-01')) {
        eraOffset = -20; // 早期实例偏红
    } else if (date > new Date('2024-01-01')) {
        eraOffset = +20; // 新实例偏蓝
    }
    
    // 4. 域名哈希扰动（关键：解决同软件同颜色问题）
    const domainHash = hashString(instance.domain);
    const domainVariation = (domainHash % 60) - 30; // ±30度
    
    // 5. 最终色相
    const finalHue = (baseHue + eraOffset + domainVariation + 360) % 360;
    
    // 6. 亮度：活跃度 (30%-75%)
    const activityRatio = instance.active_users_monthly / (instance.total_users || 1);
    const lightness = 30 + activityRatio * 45;
    
    // 7. 饱和度：用户规模 (40%-90%)
    const userScale = Math.log10((instance.total_users || 1) + 1);
    let saturation = 40 + userScale * 8;
    if (instance.total_users > 10000) {
        saturation = Math.min(saturation + 15, 90);
    }
    
    return { h: finalHue, s: saturation, l: lightness };
}
```

**配置参数**:
```javascript
const COLOR_CONFIG = {
    GENESIS_DATE: '2016-11-23T00:00:00.000Z',
    FEDIDB_START: '2021-03-21T00:00:00.000Z',
    
    ERA_EARLY_CUTOFF: '2019-01-01',
    ERA_NEW_CUTOFF: '2024-01-01',
    ERA_EARLY_OFFSET: -20,  // 度
    ERA_NEW_OFFSET: +20,    // 度
    
    HUE_MIN: 0,    // 红色（老）
    HUE_MAX: 240,  // 蓝色（新）
    
    LIGHTNESS_MIN: 30,
    LIGHTNESS_MAX: 75,
    
    SATURATION_MIN: 40,
    SATURATION_MAX: 90,
    
    DOMAIN_HASH_RANGE: 30,  // ±30度
};
```

**预期视觉效果**:
```
mastodon.social (2016): HSL(20, 85, 45)  → 橙红色老星
pixelfed.social (2019): HSL(90, 80, 50)  → 黄绿色
misskey.io (2021):      HSL(160, 75, 55) → 青色
mas.to (2023):          HSL(220, 70, 60) → 蓝色
新实例 (2025):          HSL(260, 65, 65) → 蓝紫色

同软件不同实例：因域名哈希扰动，颜色各异 ✅
```

---

### 2. 空间布局算法

**最终决策**: 三体系统 + 多星系团混合

**核心理念**:
- **顶层**: 66种软件类型 = 66个独立星系
- **Mastodon特殊处理**: 前3大实例形成等边三角形（三恒星系统）
- **其他星系**: 最大实例为中心，其他实例轨道分布

**三恒星系统**:
```
         misskey.io (或第三大实例)
              ★
             /\
            /  \
           /    \
          /      \
 mastodon.social ——— pawoo.net
       ★              ★
   (0, 0, 0)     (8000, 0, 0)
              
   mastodon.cloud: (4000, 6928, 0) // 等边三角形顶点
```

**实现细节**:

```javascript
const SPACE_CONFIG = {
    // 三恒星系统（Mastodon前3大实例）
    THREE_STARS: [
        { domain: 'mastodon.social', pos: [0, 0, 0] },
        { domain: 'pawoo.net', pos: [8000, 0, 0] },
        { domain: 'mastodon.cloud', pos: [4000, 6928, 0] }  // 等边三角形
    ],
    
    // 距离计算公式
    DISTANCE_BASE: 500,
    DISTANCE_LOG_MULTIPLIER: 300,
    DISTANCE_RANK_MULTIPLIER: 50,
    
    // 星系参数
    GALAXY_RADIUS_MIN: 2000,
    GALAXY_RADIUS_MAX: 8000,
    INCLINATION_RANGE: 30,  // ±30度
    MIN_DISTANCE: 10,       // 最小间距（碰撞检测）
};

function calculatePosition(instance, allInstances) {
    const software = instance.software;
    const sameType = allInstances.filter(i => i.software === software);
    const sorted = sameType.sort((a, b) => b.total_users - a.total_users);
    
    // Mastodon三恒星特殊处理
    if (software === 'mastodon') {
        const starConfig = SPACE_CONFIG.THREE_STARS.find(
            s => s.domain === instance.domain
        );
        if (starConfig) {
            return { x: starConfig.pos[0], y: starConfig.pos[1], z: starConfig.pos[2] };
        }
        // 其他Mastodon实例围绕最近的母星
        const motherStar = findNearestStar(instance);
        return orbitAroundStar(instance, motherStar, sorted);
    }
    
    // 其他软件：最大实例为星系中心
    const galaxyCenter = generateGalaxyCenterPosition(software);
    
    if (instance === sorted[0]) {
        return galaxyCenter; // 最大实例在中心
    }
    
    // 其他实例轨道分布
    const rank = sorted.indexOf(instance);
    const distance = SPACE_CONFIG.DISTANCE_BASE 
        + Math.log10(instance.total_users + 1) * SPACE_CONFIG.DISTANCE_LOG_MULTIPLIER 
        + rank * SPACE_CONFIG.DISTANCE_RANK_MULTIPLIER;
    
    const angle = hashString(instance.domain) * 2 * Math.PI / 0xFFFFFFFF;
    const inclination = ((hashString(instance.domain + software) % 60) - 30) * Math.PI / 180;
    
    return {
        x: galaxyCenter.x + Math.cos(angle) * distance * Math.cos(inclination),
        y: galaxyCenter.y + Math.sin(angle) * distance * Math.cos(inclination),
        z: galaxyCenter.z + Math.sin(inclination) * distance * 0.3
    };
}

// 基于软件名哈希生成星系中心位置
function generateGalaxyCenterPosition(software) {
    const hash = hashString(software);
    const angle = (hash % 360) * Math.PI / 180;
    const distance = 15000 + (hash % 10000);
    
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        z: ((hash >> 8) % 6000) - 3000
    };
}
```

**预期视觉效果**:
```
顶视图:
         ★ mastodon.social
        / \
       /   \
      ★     ★ pawoo / mastodon.cloud
     
         ★ misskey.io (独立星系)
        / \
       
    ★ pleroma    ★ pixelfed    ★ lemmy
    
侧视图:
    ★ (Mastodon三角)
   /|\
  / | \
 ★  ★  ★ (其他星系在不同高度散布)
```

---

### 3. 实例创建时间获取

**最终决策**: 多级fallback策略

```javascript
async function getInstanceCreationTime(instance) {
    const firstSeen = new Date(instance.first_seen_at);
    const FEDIDB_START = new Date('2021-03-21');
    
    // 1. first_seen_at 在 2021-03-21 之后 → 可信
    if (firstSeen > FEDIDB_START) {
        return {
            created_at: firstSeen.toISOString(),
            source: 'first_seen_at',
            reliable: true
        };
    }
    
    // 2. 查询实例API获取管理员账户创建时间
    try {
        const response = await fetch(`https://${instance.domain}/api/v1/instance`);
        const data = await response.json();
        
        if (data.contact?.account?.created_at) {
            return {
                created_at: data.contact.account.created_at,
                source: 'admin_account',
                reliable: true
            };
        }
    } catch (error) {
        // API失败，继续fallback
    }
    
    // 3. 最终fallback
    return {
        created_at: firstSeen.toISOString(),
        source: 'first_seen_at_fallback',
        reliable: false
    };
}
```

---

### 4. 交互系统

**最终决策**: WebGL拾取 + Canvas标签 + Tooltip（方案A+C混合）

**架构**:
```
┌─────────────────────────────────────────┐
│  Layer 4: DOM详情面板 (1个，点击显示)    │
├─────────────────────────────────────────┤
│  Layer 3: Tooltip DOM (1个，悬停显示)   │
├─────────────────────────────────────────┤
│  Layer 2: Canvas 2D标签 (附近300个)     │
├─────────────────────────────────────────┤
│  Layer 1: WebGL粒子 (40k全部可点击)     │
└─────────────────────────────────────────┘
```

**性能预算**:
```
Layer 1 WebGL粒子渲染:     ~2ms/frame
Layer 2 Canvas标签渲染:    ~2ms/frame
Layer 3 Tooltip更新:       ~0.1ms/frame
Layer 4 详情面板:          ~0ms/frame (仅click时更新)

总计: ~4ms/frame = 理论250fps
目标: 60fps稳定 ✅
```

---

### 5. 数据获取策略

**API**: `https://api.fedidb.org/v1/servers`
**限流**: 最多 3次/分钟

**抓取策略**:
```javascript
// 每3次请求后等待60秒
if (requestCount > 0 && requestCount % 3 === 0) {
    await sleep(60000);
}
```

**预计耗时**:
```
40,000实例 ÷ 40实例/请求 = 1,000次请求
1,000次 ÷ 3次/分钟 = 333分钟 ≈ 5.5小时
```

---

## 📊 参数配置汇总

### 颜色参数
| 参数 | 值 | 说明 |
|------|-----|------|
| 创世日期 | 2016-11-23 | Fediverse诞生日 |
| FediDB开始日 | 2021-03-21 | first_seen_at可信起点 |
| 早期纪元截止 | 2019-01-01 | 之前实例偏红-20° |
| 新纪元起点 | 2024-01-01 | 之后实例偏蓝+20° |
| 色相范围 | 0°-240° | 红→蓝 |
| 亮度范围 | 30%-75% | 僵尸→活跃 |
| 饱和度范围 | 40%-90% | 小→大实例 |
| 域名哈希扰动 | ±30° | 解决同颜色问题 |

### 空间参数
| 参数 | 值 | 说明 |
|------|-----|------|
| 三恒星三角形边长 | 8000单位 | 需调试 |
| 基础轨道距离 | 500单位 | |
| 对数乘数 | 300 | 用户数影响距离 |
| 排名乘数 | 50 | 避免重叠 |
| 倾角范围 | ±30° | Z轴散布 |
| 最小间距 | 10单位 | 碰撞检测 |

### 交互参数
| 参数 | 值 | 说明 |
|------|-----|------|
| Canvas标签数 | 300 | 需性能测试 |
| 字体大小范围 | 10-16px | |
| 性能目标 | 60fps | 4ms/frame预算 |

---

## 🚀 实施阶段

### Phase 1: 数据获取与准备

**目标**: 获得完整、可用的Fediverse实例数据集

**任务**:
- [ ] 编写FediDB API抓取脚本
- [ ] 实现限流保护（3次/分钟）
- [ ] 实现创建时间获取（多级fallback）
- [ ] 数据清洗和验证
- [ ] 动态软件类型统计
- [ ] 本地缓存机制

**产出**: `data/fediverse_raw.json`

---

### Phase 2: 颜色系统

**目标**: 实现物理真实、视觉丰富的颜色映射

**任务**:
- [ ] 实现混合年龄映射函数（对数 + 纪元加权）
- [ ] 实现域名哈希扰动
- [ ] HSL → RGB 转换
- [ ] spectralIndex 兼容现有shader
- [ ] 颜色预览HTML生成（验证效果）

**产出**: `scripts/calculate-colors.js`

---

### Phase 3: 位置聚类

**目标**: 三体系统 + 星系团布局

**任务**:
- [ ] 实现三恒星位置计算
- [ ] 实现星系中心生成（基于软件名哈希）
- [ ] 实现轨道位置计算
- [ ] 碰撞检测和最小距离
- [ ] RA/DEC/Distance 格式转换
- [ ] 位置预览（2D俯视图）

**产出**: `scripts/calculate-positions.js`

---

### Phase 4: 数据转换管线

**目标**: 生成100k-Stars兼容格式

**任务**:
- [ ] 整合颜色和位置数据
- [ ] 生成 `c` (spectralIndex) 字段
- [ ] 生成 `ra`, `dec`, `d` 字段
- [ ] 附加元数据（domain, software, users等）
- [ ] 格式验证

**产出**: `index_files/fediverse_stars.json`

---

### Phase 5: WebGL交互系统

**目标**: 40k实例全部可点击

**任务**:
- [ ] 实现Three.js Raycaster点击检测
- [ ] 点击实例 → 显示详情面板
- [ ] 鼠标悬停 → Tooltip显示
- [ ] 点击实例 → 相机zoom到附近
- [ ] 测试：点击任意粒子都能响应

**产出**: `index_files/fediverse-interaction.js`

---

### Phase 6: Canvas标签渲染

**目标**: 附近重要实例显示文字标签

**任务**:
- [ ] 创建Canvas 2D overlay
- [ ] 每帧渲染逻辑（获取附近N个实例）
- [ ] 3D坐标 → 2D投影
- [ ] 字体大小自适应
- [ ] LOD实现
- [ ] 性能测试（300个标签 @ 60fps）

**产出**: `index_files/fediverse-labels.js`

---

### Phase 7: 性能优化

**目标**: 确保60fps

**任务**:
- [ ] Chrome DevTools Performance分析
- [ ] 确认每帧 < 16.67ms
- [ ] GPU内存 < 500MB
- [ ] 粒子渲染 < 3ms
- [ ] Canvas标签 < 2ms
- [ ] 不同设备测试

---

### Phase 8: 视觉增强

**目标**: 震撼效果

**任务**:
- [ ] 活跃实例脉动动画
- [ ] 软件类型图例
- [ ] 搜索功能（输入域名跳转）
- [ ] 过滤器（按软件/规模）
- [ ] 统计面板
- [ ] Tour系统适配

---

### Phase 9: 实时更新（可选）

**目标**: 支持定期更新

**任务**:
- [ ] 每日增量抓取
- [ ] 新实例淡入动画
- [ ] 时间轴功能

---

## 📁 文件结构

```
100k-Star-Challenge/
├── docs/
│   └── DEVELOPMENT_DECISIONS.md
├── scripts/
│   ├── fetch-fediverse-data.js     # Phase 1
│   ├── calculate-colors.js          # Phase 2
│   ├── calculate-positions.js       # Phase 3
│   ├── generate-star-data.js        # Phase 4
│   └── preview/
│       ├── colors.html              # 颜色预览
│       └── positions.html           # 位置预览
├── data/
│   ├── fediverse_raw.json           # 原始API数据
│   ├── fediverse_with_colors.json   # 含颜色
│   └── fediverse_stars.json         # 最终格式
├── index_files/
│   ├── fediverse_stars.json         # 部署用数据
│   ├── fediverse-interaction.js     # Phase 5
│   └── fediverse-labels.js          # Phase 6
└── FEDIVERSE_IMPLEMENTATION_PLAN.md # 本文件
```

---

## 🔧 待调试参数

以下参数需要在实现后根据视觉效果调整：

1. **三恒星三角形边长** (当前: 8000) - 是否合适？
2. **星系间距** - 不同软件星系的间隔
3. **Canvas标签数量** (当前: 300) - 性能/体验平衡
4. **色相扰动范围** (当前: ±30°) - 是否足够区分？
5. **对数映射曲线** - 年龄分布是否均匀？

**调试方法**: 实现预览页面，可视化调整

---

## 📝 开发规范

### Commit规范
```
feat: 新功能
fix: 修复
refactor: 重构
perf: 性能优化
docs: 文档
test: 测试
```

### 代码风格
- 遵循现有项目全局变量风格
- 函数驼峰命名
- 常量大写下划线
- 注释中英文混合

---

## ⏭️ 当前状态

**当前阶段**: 准备开始Phase 1

**下一步行动**:
1. 编写 `scripts/fetch-fediverse-data.js`
2. 测试抓取100个实例验证API格式
3. 实现创建时间获取逻辑

