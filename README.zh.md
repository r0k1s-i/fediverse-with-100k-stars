# 联邦宇宙 100k Stars

本项目将联邦宇宙实例映射为星空中的星体，以银河结构呈现整体生态，并支持缩放、点击、标签与近距离行星模型预览。项目基于 Three.js（r158），采用 ES Modules，运行于现代浏览器的 WebGL 环境。

English README: `README.md`

---

## 项目简介

Fediverse-with-100k-stars 是对 Chrome Experiments《100,000 Stars》的 Fediverse 化改造：以真实联邦宇宙数据驱动星空可视化，让实例像恒星一样生长、聚类、演化。

## 快速开始

本项目为静态站点，无需构建。请使用本地静态服务器启动：

```bash
python3 -m http.server 8000
# 或
npx serve .
```

访问：`http://localhost:8000`

## 主要特性

- 40k+ Fediverse 实例以星体形式渲染，按软件类型与规模分布
- 颜色映射与活跃度/年龄关联，形成“温度光谱”可视化
- 可交互星体（点击/缩放/标签），近距离显示 GLB 行星模型
- 迷你地图与网格视图辅助定位
- 运行时使用 CDN 加载 Three.js 与部分依赖

## 数据与处理流程

数据文件存放于 `data/`。原始数据格式应使用 FediDB API 文档中定义的 ServerEntity 结构：https://fedidb.com/resources/api-docs。核心处理工具位于 `scripts/fediverse-processor/`（Golang CLI）：

```bash
cd scripts/fediverse-processor
go build
./fediverse-processor -input ../../data/fediverse_raw.json -output ../../data/fediverse_final.json -verbose
```

CLI 支持通过参数读取/输出 JSON，并可输出统计信息（stdout）。

## 测试

项目包含浏览器端单元测试，使用 Mocha/Chai。启动本地服务器后访问：

```
http://localhost:8000/tests/runner.html
```

## 项目结构

```
fediverse-with-100k-stars/
├── index.html                # 页面入口
├── src/                      # 前端源码（JS/CSS/Shader/Assets）
├── data/                     # Fediverse 原始与处理后数据
├── scripts/fediverse-processor/  # Golang 数据处理 CLI
├── tests/                    # 浏览器端单元测试
├── docs/                     # 设计/计划/复盘文档
├── AGENTS.md                 # 贡献规则与流程
└── README.zh.md
```

## 贡献

本项目后续仅接受以下类型的贡献：

- 提 issue 的 bug 报告
- 新的 GLB 模型建议

原则上不增加新的功能。

## 后续计划

FediDB 开放 bulk data 获取后，计划每个月拉取并更新一次数据。页面中的星星会随着联邦宇宙的真实情况不断生长与消亡。

---

## 许可证

本项目使用 MIT License，详见 [LICENSE](LICENSE)。

最初 fork 自 [Jude-Clarke/100k-Star-Challenge](https://github.com/Jude-Clarke/100k-Star-Challenge)，源自 [Chrome Experiments: 100,000 Stars](https://stars.chromeexperiments.com)。
