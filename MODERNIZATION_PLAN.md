# 项目现代化升级计划

**创建日期**: 2026-01-11  
**项目**: 100k-Star-Challenge / Fediverse Universe  
**目标**: 保持简洁优雅的前提下，获得更优性能和现代开发体验

---

## 📋 升级原则

1. **渐进式升级** - 每个阶段独立可用，不破坏现有功能
2. **零构建工具** - 利用浏览器原生 ES Modules，不引入 Webpack/Vite
3. **保持简洁** - 不引入 TypeScript、React 等框架
4. **向后兼容** - 保留原有代码结构，逐步迁移

---

## 🎯 当前状态分析

### 技术栈 (2013年)
| 组件 | 当前版本 | 问题 |
|------|----------|------|
| Three.js | r58 | 已废弃 API，无 WebGL2，性能差 |
| jQuery | 1.7.1 | 冗余，现代浏览器不需要 |
| Underscore.js | 1.x | 可用原生 Array 方法替代 |
| Tween.js | 旧版 | 可保留或升级 |

### 代码模式问题
- 31个 JS 文件使用全局变量模式
- 50+ 个全局函数和变量
- `<script>` 同步加载阻塞渲染
- CSS 包含过时的 vendor prefixes
- 无代码分割，首屏加载全部资源

### 性能瓶颈
- `THREE.Geometry` (已废弃) vs `BufferGeometry`
- `attributes` 对象语法 (r58) vs `BufferAttribute`
- 单 ParticleSystem vs InstancedMesh
- 每帧 `traverse()` 遍历更新

---

## 🚀 升级阶段

### Phase 1: Three.js 升级 (高优先级)
**目标**: r58 → r158+ (性能提升 2-5x)

#### 1.1 API 迁移清单

| 旧 API (r58) | 新 API (r158+) | 影响文件 |
|--------------|----------------|----------|
| `THREE.Geometry` | `THREE.BufferGeometry` | galaxy.js, fediverse.js, dust.js |
| `attributes: {}` (ShaderMaterial) | `geometry.setAttribute()` | galaxy.js, hipparcos.js |
| `THREE.ImageUtils.loadTexture()` | `new THREE.TextureLoader().load()` | 所有使用纹理的文件 |
| `THREE.ParticleSystem` | `THREE.Points` | galaxy.js, dust.js |
| `geometry.vertices.push()` | `Float32Array` + `BufferAttribute` | galaxy.js |
| `geometry.colors.push()` | `Float32Array` + `BufferAttribute` | galaxy.js |

#### 1.2 具体改动示例

**Before (galaxy.js)**:
```javascript
var galacticAttributes = {
    size: { type: 'f', value: [] },
    customColor: { type: 'c', value: [] }
};

var pGalaxy = new THREE.Geometry();
for (var i = 0; i < count; i++) {
    pGalaxy.vertices.push(new THREE.Vector3(x, y, z));
    pGalaxy.colors.push(new THREE.Color(r, g, b));
}

new THREE.ShaderMaterial({
    uniforms: galacticUniforms,
    attributes: galacticAttributes,  // 已废弃
    ...
});
```

**After**:
```javascript
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
const sizes = new Float32Array(count);

for (let i = 0; i < count; i++) {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
    sizes[i] = size;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

new THREE.ShaderMaterial({
    uniforms: galacticUniforms,
    // attributes 现在从 geometry 读取
    ...
});
```

#### 1.3 纹理加载迁移

**Before**:
```javascript
var texture = THREE.ImageUtils.loadTexture("path/to/texture.png");
```

**After**:
```javascript
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load("path/to/texture.png");
```

#### 1.4 引入方式

**方案 A: Import Map (推荐)**
```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.158.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.158.0/examples/jsm/"
  }
}
</script>
<script type="module" src="src/js/main.js"></script>
```

**方案 B: 本地文件**
```
src/js/lib/
├── three.module.js (ESM 版本)
└── three.min.js (删除)
```

#### 1.5 受影响文件清单

| 文件 | 改动量 | 优先级 |
|------|--------|--------|
| galaxy.js | 高 (Geometry→Buffer) | P0 |
| fediverse.js | 高 | P0 |
| hipparcos.js | 中 | P1 |
| dust.js | 中 | P1 |
| sun.js | 低 | P2 |
| starmodel.js | 低 | P2 |
| lensflare.js | 低 | P2 |
| solarsystem.js | 低 | P2 |

---

### Phase 2: ES Modules 重构 (中优先级)
**目标**: 全局变量 → 模块化，保持简洁

#### 2.1 模块化策略

```
src/js/
├── main.js              # 入口模块
├── core/
│   ├── index.js         # 统一导出
│   ├── scene.js         # 场景初始化 (export scene, camera, renderer)
│   ├── galaxy.js        # export function generateGalaxy()
│   ├── fediverse.js     # export function loadFediverseData()
│   └── ...
├── utils/
│   ├── math.js          # export { constrain, random, map }
│   ├── dom.js           # export { $, $$ } (querySelector 封装)
│   └── loader.js        # export { loadTexture, loadJSON }
└── lib/
    └── ... (第三方库)
```

#### 2.2 渐进式迁移步骤

**Step 1**: 创建 shim 层保持兼容
```javascript
// src/js/core/globals.js
export const globals = {
    scene: null,
    camera: null,
    renderer: null,
    // ... 其他全局变量
};

// 暂时暴露到 window (兼容未迁移代码)
window.scene = globals.scene;
```

**Step 2**: 逐个文件迁移
```javascript
// src/js/core/galaxy.js
import * as THREE from 'three';
import { globals } from './globals.js';
import { constrain, random } from '../utils/math.js';

export function generateGalaxy() {
    // ...
}
```

**Step 3**: 更新 index.html
```html
<!-- 删除所有 <script> 标签 -->
<script type="module" src="src/js/main.js"></script>
```

#### 2.3 迁移顺序

1. `util.js` → `utils/math.js` (无依赖)
2. `shaderlist.js` → `core/shaders.js`
3. `galaxy.js` → 模块化
4. `fediverse.js` → 模块化
5. `main.js` → 入口整合
6. 其他文件...

---

### Phase 3: 移除 jQuery (中优先级)
**目标**: 0 依赖，原生 API

#### 3.1 替换对照表

| jQuery | 原生替代 |
|--------|----------|
| `$(selector)` | `document.querySelector(selector)` |
| `$(selector).each()` | `document.querySelectorAll(selector).forEach()` |
| `$.ajax()` | `fetch()` |
| `$(el).on('click', fn)` | `el.addEventListener('click', fn)` |
| `$(el).css('prop', val)` | `el.style.prop = val` |
| `$(el).addClass('x')` | `el.classList.add('x')` |
| `$(el).html(str)` | `el.innerHTML = str` |
| `$(el).hide()` | `el.style.display = 'none'` |
| `$(el).show()` | `el.style.display = ''` |
| `$(document).ready()` | `DOMContentLoaded` 或模块自动延迟 |

#### 3.2 工具函数封装

```javascript
// src/js/utils/dom.js
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => [...document.querySelectorAll(sel)];

export function on(el, event, handler) {
    el.addEventListener(event, handler);
    return () => el.removeEventListener(event, handler);
}

export function css(el, styles) {
    Object.assign(el.style, styles);
}
```

#### 3.3 受影响文件

| 文件 | jQuery 使用量 |
|------|--------------|
| main.js | 高 (10+ 处) |
| mousekeyboard.js | 高 |

| infocallout.js | 中 |
| minimap.js | 低 |
| helphud.js | 低 |

---

### Phase 4: CSS 现代化 (低优先级)
**目标**: 清理冗余，提升可维护性

#### 4.1 移除 Vendor Prefixes

现代浏览器已不需要以下前缀:
```css
/* 删除 */
-webkit-transition: ...;
-moz-transition: ...;
-ms-transition: ...;
-o-transition: ...;

/* 保留 */
transition: ...;
```

#### 4.2 CSS 变量化

```css
:root {
    --color-primary: #2fa1d6;
    --color-bg: #000;
    --color-text: #fff;
    --color-panel: #222;
    --font-ui: 'Segoe UI', sans-serif;
    --transition-fast: 0.1s ease;
}

.dg .c .slider-fg {
    background: var(--color-primary);
}
```

#### 4.3 内联样式外移

将 index.html 中 400+ 行内联 `<style>` 移至:
```
src/css/
├── style.css      # 主样式
├── fonts.css      # 字体
└── context-menu.css # 右键菜单样式 (新建)
```

---

### Phase 5: 性能优化 (高优先级)
**目标**: 60fps 稳定，更大规模数据

#### 5.1 InstancedMesh 替代 Points

对于需要复杂几何的对象:
```javascript
// Before: 100k 个独立 Mesh
for (let i = 0; i < 100000; i++) {
    scene.add(new THREE.Mesh(geometry, material));
}

// After: 单个 InstancedMesh
const mesh = new THREE.InstancedMesh(geometry, material, 100000);
for (let i = 0; i < 100000; i++) {
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, color);
}
scene.add(mesh);
```

#### 5.2 GPU 动画

将 CPU 动画移至着色器:
```glsl
// vertex shader
uniform float time;
attribute float phase;

void main() {
    float scale = 1.0 + sin(time + phase) * 0.1;
    vec3 pos = position * scale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

#### 5.3 LOD 系统优化

```javascript
// 基于距离的细节级别
function updateLOD() {
    const distance = camera.position.z;
    
    if (distance > 50000) {
        // 远景: 只显示银河系轮廓
        galaxyPoints.visible = true;
        instancePoints.visible = false;
    } else if (distance > 5000) {
        // 中景: 显示实例点
        galaxyPoints.visible = true;
        instancePoints.visible = true;
        labels.visible = false;
    } else {
        // 近景: 显示标签
        labels.visible = true;
    }
}
```

#### 5.4 Web Workers 数据处理

```javascript
// worker.js
self.onmessage = function(e) {
    const { instances, viewport } = e.data;
    const visible = instances.filter(i => isInViewport(i, viewport));
    self.postMessage({ visible });
};

// main.js
const worker = new Worker('src/js/workers/culling.js');
worker.postMessage({ instances, viewport });
worker.onmessage = (e) => updateVisibility(e.data.visible);
```

---

### Phase 6: 加载优化 (中优先级)

#### 6.1 异步模块加载

```javascript
// main.js
async function init() {
    // 核心模块立即加载
    const { initScene } = await import('./core/scene.js');
    await initScene();
    
    // 非关键模块延迟加载
    requestIdleCallback(async () => {
        // 延迟加载非关键功能模块
    });
}
```

#### 6.2 资源预加载

```html
<head>
    <!-- 关键资源预加载 -->
    <link rel="preload" href="src/assets/textures/star_color_modified.png" as="image">
    <link rel="preload" href="data/fediverse_final.json" as="fetch" crossorigin>
    <link rel="modulepreload" href="src/js/main.js">
</head>
```

#### 6.3 纹理压缩

```bash
# 使用 KTX2 压缩纹理
npx ktx-compressor src/assets/textures/*.png --output src/assets/textures/compressed/
```

```javascript
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
const loader = new KTX2Loader();
loader.load('texture.ktx2', (texture) => { ... });
```

---

## 📅 实施时间表

| Phase | 名称 | 预计工时 | 优先级 | 依赖 | 状态 |
|-------|------|----------|--------|------|------|
| 1 | Three.js 升级 | 16-24h | P0 | 无 | ✅ 已完成 |
| 2 | ES Modules 重构 | 12-16h | P1 | Phase 1 | ✅ 已完成 |
| 3 | 移除 jQuery | 4-6h | P2 | Phase 2 | ✅ 已完成 |
| 4 | CSS 现代化 | 2-4h | P3 | 无 | ✅ 已完成 |
| 5 | 性能优化 | 8-12h | P1 | Phase 1 | ✅ 已完成 |
| 6 | 加载优化 | 4-6h | P2 | Phase 2 | ✅ 已完成 |

**总计**: 46-68 小时

---

## ✅ 验收标准

### 功能验收
- [ ] 所有现有功能正常工作
- [ ] 40k+ 实例渲染正常
- [ ] 交互系统响应正常


### 性能验收
- [ ] 首屏加载 < 3s (良好网络)
- [ ] 稳定 60fps (中端设备)
- [ ] 内存占用 < 500MB
- [ ] Lighthouse 性能分 > 80

### 代码质量
- [ ] 零全局变量污染
- [x] 零 jQuery 依赖
- [ ] 零废弃 API 使用
- [ ] ESLint 零错误

---

## 🔄 回滚策略

每个 Phase 完成后创建 Git tag:
```bash
git tag -a v2.0-phase1 -m "Three.js r158 upgrade"
git tag -a v2.0-phase2 -m "ES Modules migration"
git tag -a v2.0-phase3 -m "jQuery removal"
```

如需回滚:
```bash
git checkout v2.0-phase1
```

---

## 📝 更新日志

### 2026-01-12
- ✅ **Phase 4 完成**: CSS 现代化
  - 移除 index.html 中所有内联样式，迁移至独立文件
  - 重构 `src/css/style.css`，移除 400+ 行冗余 vendor prefixes
  - 创建 `src/css/context-menu.css`
  - 引入 CSS 变量系统 (:root) 统一管理设计 Tokens
  - 优化 CSS 选择器和代码结构

### 2026-01-12 (Phase 6 完成)
- ✅ **Phase 6 完成**: 加载优化
  - ⚡ **ES Modules 架构完善**: 
    - `index.html` 移除 40+ 个 `<script>` 标签
    - `main.js` 重构为单一入口，显式管理所有依赖
    - 消除全局变量依赖 (大部分模块)
  - ⚡ **资源预加载**: 添加 `<link rel="preload">` 关键纹理和数据
  - 🛠 **工具库优化**: `dom.js` 功能增强，移除 inline scripts

### 2026-01-12 (Phase 5 完成)
- ✅ **Phase 5 完成**: 性能优化
  - ✅ **Icons 渲染优化**: 将 700+ 个实例预览 Mesh 转换为单 draw call 的 `THREE.Points`
    - 创建 `src/shaders/icon.vsh/fsh`
    - 重构 `fediverse.js` 逻辑
    - 性能瓶颈移除：大幅减少 Object3D 和 Draw Calls
  - ✅ **GPU 动画**: Icons 的淡入淡出和缩放逻辑移至 Shader

### 2026-01-12 (Phase 4 完成)
- ✅ **Phase 4 完成**: CSS 现代化

### 2026-01-12
- ✅ **Phase 3 完成**: 移除 jQuery 依赖
  - 创建 `src/js/utils/dom.js` 原生 DOM 工具库
  - 迁移 5 个核心文件 (main.js, fediverse-interaction.js, minimap.js, marker.js, legacymarkers.js)
  - 移除 jQuery 库文件 (jquery-1.7.1.min.js, jquery.mousewheel.js, jquery.preventMacBackScroll.js, jquery.tooltip.js)
  - 更新 index.html 移除 jQuery 引用
  - 减少约 100KB 外部依赖

### 2026-01-11
- 📝 创建现代化升级计划文档
- 🔍 完成现有代码结构分析
- 📋 制定 6 阶段升级路线图
