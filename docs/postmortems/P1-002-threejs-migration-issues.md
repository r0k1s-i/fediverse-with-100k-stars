# Postmortem Report: Three.js 升级迁移 - 纹理加载和 Shader 问题

**事故编号**: INC-005  
**严重级别**: P1 (High - 核心视觉效果失效)  
**发生时间**: 2026-01-12  
**影响时长**: ~2 小时  
**负责人**: r0k1s#i  
**状态**: ✅ 已解决

---

## 执行摘要

在 Three.js 从旧版本升级到 r158 和 ES Modules 架构迁移过程中，出现大量纹理加载失败，导致粒子系统显示为**白色方块**，严重影响视觉效果。根本原因包括 `setCrossOrigin()` API 废弃、缺少错误处理、Shader alpha 通道处理不当等。这是一次典型的**大版本升级技术债务暴露**事故。

---

## 事故时间线

| 时间 | 事件 |
|------|------|
| 2026-01-11 20:10 | 开始 Three.js r158 升级 (commit 701e4c8) |
| 2026-01-11 21:16 | ES Modules 架构迁移 (commit c0ca79d) |
| 2026-01-12 01:24 | 发现纹理加载问题，开始修复 |
| 2026-01-12 01:24:36 | 移除 setCrossOrigin 并添加错误处理 (d380bc8) |
| 2026-01-12 01:24:49 | 修复 shader 和剩余纹理加载问题 (d87925c) |
| 2026-01-12 02:43 | 完成迁移 (commit cdfc13c) |

---

## 事故详情

### 严重程度评估

- **用户影响**: 100% - 所有用户看到白色方块代替星球/粒子
- **功能影响**: 视觉效果完全失效
- **业务影响**: 项目展示效果严重受损
- **数据影响**: 无数据丢失

**定级理由**: P1 级 - 核心视觉功能失效，但基本浏览仍可用

### 根本原因分析

**主要问题**:
1. **API 废弃**: Three.js r158 废弃了 `TextureLoader.setCrossOrigin()`
2. **静默失败**: 纹理加载错误无错误处理，难以调试
3. **Shader 兼容性**: Icon shader alpha 判断逻辑不兼容新纹理格式
4. **CORS 配置**: crossOrigin 设置在某些环境导致加载失败
5. **预加载冲突**: HTML preload 与动态加载冲突

---

## 技术细节

### 受影响文件（14 个）
- **核心文件**: main.js, sun.js, skybox.js
- **粒子系统**: hipparcos.js, fediverse.js, galaxy.js, dust.js
- **UI 组件**: infocallout.js, minimap.js
- **效果**: lensflare.js, guides.js, plane.js
- **Shader**: icon.fsh
- **HTML**: index.html

### 问题详解

#### 问题 1: setCrossOrigin API 废弃

**错误代码**:
```javascript
// ❌ Three.js r158 中已废弃
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
const texture = textureLoader.load('textures/star.png');
```

**错误信息**:
```
Warning: THREE.TextureLoader: .setCrossOrigin() has been deprecated. 
Use loadingManager.setCrossOrigin() instead.
```

**修复方案 1**: 移除 setCrossOrigin（推荐）
```javascript
// ✅ 大多数情况下不需要设置
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('textures/star.png');
```

**修复方案 2**: 使用 LoadingManager
```javascript
// ✅ 如果确实需要 CORS 控制
const loadingManager = new THREE.LoadingManager();
loadingManager.setCrossOrigin('anonymous');

const textureLoader = new THREE.TextureLoader(loadingManager);
const texture = textureLoader.load('textures/star.png');
```

**本项目选择**: 方案 1，移除所有 setCrossOrigin 调用

#### 问题 2: 缺少错误处理

**问题**: 纹理加载失败静默，难以调试

**修复前**:
```javascript
const texture = textureLoader.load(
    'textures/star.png',
    onLoad,  // 成功回调
    undefined, // 进度回调（未使用）
    undefined  // ❌ 没有错误回调
);
```

**修复后**:
```javascript
function onTextureError(err) {
    console.error(`Failed to load texture: ${err.target?.src || 'unknown'}`);
}

const texture = textureLoader.load(
    'textures/star.png',
    onLoad,
    undefined,
    onTextureError // ✅ 添加错误处理
);
```

**应用到所有文件**:
- sun.js: 3 处
- skybox.js: 6 处
- hipparcos.js: 2 处
- fediverse.js: 2 处
- galaxy.js: 1 处
- dust.js: 1 处
- lensflare.js: 1 处
- plane.js: 1 处
- guides.js: 1 处
- minimap.js: 1 处

#### 问题 3: Shader Alpha 处理不当

**症状**: Icon 纹理显示为白色方块

**原因**: Shader 只检查 alpha 通道，但某些纹理使用 RGB 0 表示透明

**修复前**:
```glsl
// icon.fsh
void main() {
    vec4 texColor = texture2D(map, vUv);
    
    // ❌ 只检查 alpha，RGB=(0,0,0) 时会保留
    if (texColor.a < 0.1) {
        discard;
    }
    
    gl_FragColor = texColor * vColor;
}
```

**修复后**:
```glsl
// icon.fsh
void main() {
    vec4 texColor = texture2D(map, vUv);
    
    // ✅ 同时检查 alpha 和 RGB 值
    if (texColor.a < 0.1 || length(texColor.rgb) < 0.1) {
        discard;
    }
    
    gl_FragColor = texColor * vColor;
}
```

**解释**: 
- `length(texColor.rgb)` 计算 RGB 向量长度
- 当 RGB 接近 (0,0,0) 时，length < 0.1，丢弃该像素
- 解决了"黑色背景显示为白色方块"的问题

#### 问题 4: 纹理颜色乘法错误

**问题**: 某些纹理颜色过暗或过亮

**修复**:
```glsl
// ❌ 错误：直接乘法可能导致颜色异常
gl_FragColor = texColor * vColor;

// ✅ 正确：考虑预乘 alpha
gl_FragColor = vec4(texColor.rgb * vColor.rgb, texColor.a * vColor.a);
```

#### 问题 5: 回调函数签名错误

**问题**: setLoadMessage() 回调位置错误

**修复前**:
```javascript
// ❌ 回调在错误位置
textureLoader.load(
    'texture.png',
    setLoadMessage('message'), // 立即执行
    undefined,
    onError
);
```

**修复后**:
```javascript
// ✅ 正确的回调
textureLoader.load(
    'texture.png',
    () => setLoadMessage('message'), // 返回函数
    undefined,
    onError
);
```

#### 问题 6: HTML 预加载冲突

**问题**: index.html 中的 preload 链接导致 CORS 错误

**修复**:
```html
<!-- ❌ 移除：与动态加载冲突 -->
<link rel="preload" href="textures/star.png" as="image">

<!-- HTML 中不再预加载纹理 -->
```

#### 问题 7: 图片元素 crossOrigin

**问题**: Gradient 图片用于动态纹理时需要 CORS

**修复**:
```javascript
// infocallout.js
const gradientImg = new Image();
gradientImg.crossOrigin = 'anonymous'; // ✅ 添加
gradientImg.src = 'textures/gradient.png';
```

---

## 复现步骤

### 环境要求
- Three.js r158
- 本地开发服务器或 file:// 协议

### 复现操作
1. 升级 Three.js 到 r158
2. 保留旧的 `setCrossOrigin()` 调用
3. 加载页面
4. **观察**: 
   - 控制台警告: "setCrossOrigin() has been deprecated"
   - 粒子/星球显示为白色方块
   - 部分纹理加载失败但无错误信息

---

## 修复方案

### 修复提交

| Commit | 描述 | 文件数 |
|--------|------|--------|
| d380bc8 | 移除 setCrossOrigin，添加错误处理 | 12 |
| d87925c | 修复 shader 和剩余问题 | 3 |

### 完整修复清单

#### 1. 移除所有 setCrossOrigin
```bash
# 影响文件
- src/js/core/dust.js
- src/js/core/fediverse.js
- src/js/core/galaxy.js
- src/js/core/guides.js
- src/js/core/hipparcos.js
- src/js/core/lensflare.js
- src/js/core/main.js
- src/js/core/minimap.js
- src/js/core/plane.js
- src/js/core/skybox.js
- src/js/core/sun.js
```

#### 2. 添加统一错误处理
```javascript
// 添加到所有文件
function onTextureError(err) {
    console.error(`Texture load error in ${filename}:`, err);
}
```

#### 3. 修复 icon shader
```glsl
// src/shaders/icon.fsh
if (texColor.a < 0.1 || length(texColor.rgb) < 0.1) {
    discard;
}
```

#### 4. 修复回调和其他问题
- infocallout.js: 添加 img.crossOrigin
- 多个文件: 修复 setLoadMessage 回调
- index.html: 移除纹理 preload

### 验证结果
- ✅ 无 setCrossOrigin 警告
- ✅ 所有纹理正确加载
- ✅ 星球和粒子正常显示
- ✅ 纹理加载错误有清晰日志
- ✅ 所有视觉效果恢复正常

---

## 经验教训

### 做得好的地方 ✅
1. **系统性修复**: 一次性修复所有相关文件
2. **添加错误处理**: 提升未来可调试性
3. **详细记录**: Commit message 清晰记录修复内容

### 需要改进的地方 ⚠️
1. **缺乏迁移计划**: 未事先评估 API 变更影响
2. **测试不足**: 升级后未进行充分测试
3. **技术债务**: setCrossOrigin 调用分散在多个文件
4. **文档缺失**: 纹理加载模式未标准化

### 核心教训 💡

#### 1. 大版本升级需要迁移计划

**问题**: 直接升级导致意外问题

**改进流程**:
```markdown
# Three.js 升级检查清单
1. 阅读 Migration Guide
2. 检查 Breaking Changes
3. 搜索废弃 API 使用（grep）
4. 创建测试环境验证
5. 逐步迁移和测试
6. 文档更新
```

#### 2. 统一的资源加载工具

**问题**: 每个文件独立实现纹理加载

**解决方案**:
```javascript
// utils/texture-loader.js
export class TextureLoader {
    static instance = new THREE.TextureLoader();
    
    static load(url, onProgress) {
        return new Promise((resolve, reject) => {
            this.instance.load(
                url,
                resolve,
                onProgress,
                (err) => {
                    console.error(`Failed to load ${url}:`, err);
                    reject(err);
                }
            );
        });
    }
}

// 使用
const texture = await TextureLoader.load('textures/star.png');
```

**优势**:
- 统一错误处理
- 支持 Promise
- 集中配置（如 crossOrigin）
- 易于添加缓存、重试等功能

#### 3. Shader 兼容性测试

**问题**: Shader 在不同纹理格式下行为不一致

**预防**:
```javascript
// shader-test.js
describe('Icon Shader', () => {
    test('should handle alpha channel transparency', () => {
        const input = { r: 1, g: 1, b: 1, a: 0 };
        expect(shader.process(input)).toBe('discard');
    });
    
    test('should handle RGB black transparency', () => {
        const input = { r: 0, g: 0, b: 0, a: 1 };
        expect(shader.process(input)).toBe('discard');
    });
});
```

#### 4. API 废弃监控

**工具**: ESLint 规则
```javascript
// .eslintrc.js
rules: {
    'no-restricted-properties': ['error', {
        object: 'TextureLoader',
        property: 'setCrossOrigin',
        message: 'Use LoadingManager.setCrossOrigin instead (Three.js r158+)'
    }]
}
```

---

## 预防措施

### 短期措施 (1 周)
- [x] 修复所有纹理加载问题
- [x] 添加错误处理
- [ ] **创建纹理加载测试**: 验证所有纹理能正确加载
- [ ] **视觉回归测试**: 截图对比确保视觉效果正确

### 中期措施 (1 月)
- [ ] **统一资源加载器**: 创建 TextureLoader 工具类
- [ ] **Shader 测试套件**: 单元测试所有 shader
- [ ] **升级指南文档**: 记录 Three.js 升级注意事项
- [ ] **ESLint 规则**: 禁止使用废弃 API

### 长期措施 (3 月)
- [ ] **依赖版本锁定策略**: 控制升级节奏
- [ ] **升级自动化**: 脚本检测 breaking changes
- [ ] **监控告警**: 纹理加载失败率监控
- [ ] **资源管理系统**: 统一管理所有外部资源

---

## Three.js 升级最佳实践

### 升级前准备

1. **评估影响**
   ```bash
   # 搜索可能受影响的 API
   grep -r "setCrossOrigin" src/
   grep -r "new THREE\." src/
   ```

2. **阅读文档**
   - [Three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
   - [Release Notes](https://github.com/mrdoob/three.js/releases)
   - Breaking Changes 列表

3. **创建测试分支**
   ```bash
   git checkout -b feature/threejs-r158-upgrade
   ```

### 升级过程

1. **更新依赖**
   ```json
   {
     "dependencies": {
       "three": "^0.158.0"
     }
   }
   ```

2. **修复废弃 API**
   - 使用编辑器全局搜索替换
   - 运行 ESLint 检查
   - 逐个文件验证

3. **测试验证**
   - 单元测试
   - 集成测试
   - 手动视觉检查

4. **性能回归测试**
   - FPS 监控
   - 内存使用
   - 加载时间

### 升级后

1. **监控错误**
   - 控制台错误
   - Sentry 错误追踪
   - 用户反馈

2. **性能对比**
   - 对比升级前后性能
   - 识别性能回退

3. **文档更新**
   - 更新技术栈说明
   - 记录遇到的问题和解决方案

---

## 相关资源

### 代码引用
- 主要修复: [`d380bc8`](../commits/d380bc8feb36d7b419e07820e2f47c03d9413b5f)
- Shader 修复: [`d87925c`](../commits/d87925c2fb837b834d90ab751db71ccd52cd8964)

### Three.js 文档
- [TextureLoader](https://threejs.org/docs/#api/en/loaders/TextureLoader)
- [LoadingManager](https://threejs.org/docs/#api/en/loaders/LoadingManager)
- [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)

### 相关事故
- INC-012: 废弃 API 使用（技术债务）

---

## 附录

### A. 修复统计

| 类别 | 数量 |
|------|------|
| 移除 setCrossOrigin | 11 处 |
| 添加错误处理 | 19 处 |
| 修复 Shader | 1 个 |
| 修复回调 | 3 处 |
| HTML 修改 | 1 处 |
| **总计文件修改** | **14 个** |

### B. 纹理加载模式对比

**旧模式** (Three.js r90-):
```javascript
const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');
const texture = loader.load('tex.png');
```

**新模式** (Three.js r158+):
```javascript
// 方式 1: 直接加载（推荐）
const loader = new THREE.TextureLoader();
const texture = loader.load('tex.png', onLoad, onProgress, onError);

// 方式 2: 使用 LoadingManager
const manager = new THREE.LoadingManager();
manager.setCrossOrigin('anonymous');
const loader = new THREE.TextureLoader(manager);
```

### C. Shader Alpha 处理技术

| 方法 | 代码 | 适用场景 |
|------|------|---------|
| Alpha only | `if (a < 0.1) discard;` | 标准 RGBA 纹理 |
| RGB length | `if (length(rgb) < 0.1) discard;` | 黑色=透明的纹理 |
| **Combined** | `if (a < 0.1 \|\| length(rgb) < 0.1) discard;` | **通用方案** ✅ |
| Premultiplied | `rgb *= a;` | 预乘 alpha 纹理 |

---

**审核人**: _待填写_  
**批准人**: _待填写_  
**文档版本**: 1.0  
**最后更新**: 2026-01-12
