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

**算法要点**:
1. 对数年龄映射（解决线性映射颜色分布不均）
2. 基础色相：240°(蓝) → 0°(红)
3. 纪元修正：早期实例偏红-20°，新实例偏蓝+20°
4. 域名哈希扰动：±30°（解决同软件同颜色问题）
5. 亮度由活跃度决定，饱和度由用户规模决定

---

### 2. 空间布局算法

**最终决策**: 三体系统 + 多星系团混合

**核心理念**:
- **顶层**: 66种软件类型 = 66个独立星系
- **Mastodon特殊处理**: 前3大实例形成等边三角形（三恒星系统）
- **其他星系**: 最大实例为中心，其他实例轨道分布

**算法要点**:
1. 三恒星系统：mastodon.social、pawoo.net、mastodon.cloud 形成等边三角形
2. 星系中心由软件名哈希生成
3. 轨道距离 = 基础距离 + log(用户数) × 乘数 + 排名 × 乘数
4. 角度和倾角由域名哈希决定

---

### 3. 实例创建时间获取

**最终决策**: 多级fallback策略

1. `first_seen_at` 在 2021-03-21 之后 → 可信
2. 查询实例API获取管理员账户创建时间
3. 最终fallback使用 `first_seen_at`

---

### 4. 交互系统

**最终决策**: WebGL拾取 + Canvas标签 + Tooltip

**四层架构**:
- Layer 4: DOM详情面板 (点击显示)
- Layer 3: Tooltip DOM (悬停显示)
- Layer 2: Canvas 2D标签 (附近300个)
- Layer 1: WebGL粒子 (40k全部可点击)

**性能预算**: ~4ms/frame，目标60fps

---

### 5. 数据获取策略

**API**: `https://api.fedidb.org/v1/servers`
**限流**: 3次/分钟
**预计耗时**: ~5.5小时 (40,000实例)

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

### Phase 1: 数据获取与准备 (Node.js)
**目标**: 获得完整Fediverse实例数据集
**产出**: `data/fediverse_raw.json`

### Phase 2: 颜色系统 (Golang)
**目标**: 实现颜色映射算法
**产出**: `scripts/fediverse-processor/colors.go`

### Phase 3: 位置聚类 (Golang)
**目标**: 实现三体系统 + 星系团布局
**产出**: `scripts/fediverse-processor/positions.go`

### Phase 4: 数据转换管线 (Golang)
**目标**: 生成100k-Stars兼容格式
**产出**: `data/fediverse_final.json`

### Phase 5: WebGL交互系统
**目标**: 40k实例全部可点击
**产出**: `index_files/fediverse-interaction.js`

### Phase 6: Canvas标签渲染
**目标**: 附近重要实例显示文字标签
**产出**: `index_files/fediverse-labels.js`

### Phase 7: 性能优化
**目标**: 确保60fps

### Phase 8: 视觉增强
**目标**: 搜索、过滤、统计面板

### Phase 9: 实时更新（可选）
**目标**: 支持定期更新

---

## 📁 文件结构

```
100k-Star-Challenge/
├── scripts/
│   ├── fetch-fediverse-data.js      # Phase 1 (Node.js)
│   └── fediverse-processor/         # Phase 2-4 (Golang)
│       ├── main.go
│       ├── colors.go
│       ├── positions.go
│       └── go.mod
├── data/
│   ├── fediverse_raw.json           # Phase 1 输出
│   └── fediverse_final.json         # Phase 4 输出
├── index_files/
│   ├── fediverse.js
│   ├── fediverse-interaction.js
│   └── fediverse-labels.js
└── preview/
    └── index.html
```

---

## 🔧 待调试参数

1. 三恒星三角形边长 (当前: 8000)
2. 星系间距
3. Canvas标签数量 (当前: 300)
4. 色相扰动范围 (当前: ±30°)
5. 对数映射曲线

---

## ⏭️ 当前状态

**更新时间**: 2026-01-09 15:45

**当前阶段**: Phase 2-4 已完成，准备开始 Phase 5

### 已完成
- [x] Phase 1 脚本 (`scripts/fetch-fediverse-data.js`) - 测试通过
- [x] **Phase 2-4 Golang 处理器** - 测试通过 ✨
  - [x] `scripts/fediverse-processor/main.go` - 主程序入口
  - [x] `scripts/fediverse-processor/colors.go` - 颜色计算算法
  - [x] `scripts/fediverse-processor/positions.go` - 位置计算算法
  - [x] `scripts/fediverse-processor/types.go` - 数据结构定义
- [x] Phase 5 框架 (`index_files/fediverse.js`)
- [x] 预览页面 (`preview/index.html`)

### 性能测试结果
- **测试数据**: 120个实例（13种软件）
- **处理速度**:
  - 颜色计算: 82 微秒
  - 位置计算: 65 微秒
  - **总耗时**: 147 微秒（0.147 毫秒）
- **预计 40k 实例耗时**: ~49 毫秒（远超预期！）

### 待执行
- [ ] 完整数据抓取 (~40,000实例)
- [ ] 用 Golang 处理完整数据
- [ ] Phase 5: WebGL 交互系统集成
- [ ] Phase 6-8: Canvas 标签、性能优化、视觉增强

### 测试数据
- 已抓取: 120个实例 (测试模式)
- 软件类型: 13种
- 位置类型分布:
  - 三恒星中心: 2个 (mastodon.social, mastodon.cloud)
  - Mastodon 轨道: 78个
  - 星系中心: 12个
  - 星系轨道: 28个

### 技术变更
- 数据处理语言: Node.js → **Golang** (性能优化)
  - **收益**: 预计比 Node.js 快 200-300 倍
  - **部署**: 单一二进制文件，无需依赖
