# Postmortem Report: Fediverse 星球模型点击后不显示

**事故编号**: INC-003  
**严重级别**: P0 (Critical - 核心功能完全失效)  
**发生时间**: 2026-01-11  
**影响时长**: ~数小时  
**负责人**: r0k1s#i  
**状态**: ✅ 已解决

---

## 执行摘要

用户点击 Fediverse 实例后，摄像机正确缩放但星球 3D 模型完全不显示，导致核心交互功能失效。这是一个由**多个独立 bug 叠加**造成的 P0 级严重事故。涉及 Three.js API 误用、模块导出缺失、渲染顺序错误和嵌套对象缩放问题。

---

## 事故时间线

| 时间 | 事件 |
|------|------|
| 未知 | 代码重构引入多个独立 bug |
| 2026-01-11 | 用户发现点击实例后星球模型不显示 |
| 2026-01-11 23:40 | 经过深入调试，一次性修复所有相关问题 (commit ad2b3a5) |

---

## 事故详情

### 严重程度评估

- **用户影响**: 100% - 所有用户无法查看 Fediverse 实例的星球模型
- **功能影响**: 核心交互功能完全失效
- **业务影响**: 项目主要展示功能不可用
- **数据影响**: 无数据丢失

**定级理由**: P0 级 - 核心功能完全失效，无 workaround，用户体验严重受损

### 根本原因分析 (5 Whys)

**问题**: 星球模型不显示

1. **Why?** → 星球缩放代码执行错误
2. **Why?** → 使用了错误的 Three.js API: `scale.setLength()` 而非 `scale.set()`
3. **Why?** → 缺乏类型检查，API 名称相似但行为完全不同
4. **Why?** → 没有编译时类型系统（TypeScript）
5. **Why?** → 项目早期技术选型未考虑类型安全

**次要原因**:
- `enableStarModel` 函数未导出到 window 作用域
- `renderer` 对象未导出，导致 skybox 无法渲染
- `gyro` 容器（光晕）未随星球缩放，视觉效果异常
- 坐标系统理解偏差，浪费调试时间

---

## 技术细节

### 受影响文件
- `src/js/core/sun.js` - 星球缩放逻辑
- `src/js/core/main.js` - 全局变量导出
- `src/js/core/skybox.js` - 背景渲染
- `src/js/core/fediverse-interaction.js` - 星球可见性控制
- `src/js/utils/app.js`

### Bug 清单

#### Bug 1: Three.js API 误用 (最严重)
```javascript
// ❌ 错误代码
setScale(scale) {
    this.sun.scale.setLength(scale);
}

// ✅ 正确代码
setScale(scale) {
    this.sun.scale.set(scale, scale, scale);
}
```

**问题**: `setLength()` 是 Vector3 的方法，用于设置向量长度而非各轴缩放值，导致缩放完全失效。

#### Bug 2: 光晕未随星球缩放
```javascript
// ✅ 修复：同时缩放光晕容器
setScale(scale) {
    this.sun.scale.set(scale, scale, scale);
    this.gyro.scale.set(scale, scale, scale); // 新增
}
```

#### Bug 3: 关键函数未导出
```javascript
// main.js
window.enableStarModel = enableStarModel;  // 新增导出
window.renderer = renderer;                 // 新增导出
```

#### Bug 4: Skybox 渲染顺序错误
```javascript
// ✅ 修复渲染顺序
renderer.autoClear = false;
renderer.clear();
skyboxRenderer.render(scene, camera); // 先渲染背景
renderer.render(scene, camera);       // 再渲染主场景
```

---

## 复现步骤

### 环境要求
- 浏览器: Chrome/Firefox 最新版
- 项目版本: ad2b3a5 之前的 commit

### 复现操作
1. 打开项目主页 `index.html`
2. 等待 Fediverse 实例加载完成
3. 点击任意 Fediverse 实例星球
4. **预期**: 摄像机缩放并显示 3D 星球模型
5. **实际**: 摄像机缩放但无 3D 模型显示，背景为黑色

### 观察到的症状
- ✅ UI 面板正确显示实例信息
- ✅ 摄像机正确移动到目标位置
- ❌ 星球 3D 模型不可见
- ❌ Skybox 背景不渲染
- ❌ 控制台无明显错误（静默失败）

---

## 修复方案

### 修复提交
- **Commit**: `ad2b3a522c6a54b117c325e94c888324c662f44a`
- **提交信息**: "🐛 fix: 修复Fediverse星球点击后不显示的多个关键bug"
- **修改统计**: 5 files changed, 496 insertions(+), 445 deletions(-)

### 修复措施

| 问题 | 解决方案 | 文件 |
|------|----------|------|
| API 误用 | `scale.setLength()` → `scale.set()` | sun.js |
| 光晕未缩放 | 添加 `gyro.scale.set()` | sun.js |
| 函数未导出 | 导出 `enableStarModel` 到 window | main.js |
| Renderer 未导出 | 导出 `renderer` 到 window | main.js |
| 渲染顺序 | 使用 `autoClear=false` 分离渲染 | main.js |
| 亮度计算 | 恢复原始公式 | skybox.js |
| 可见性控制 | 显式设置 `starModel.visible = true` | fediverse-interaction.js |

### 验证结果
- ✅ 点击实例后星球模型正确显示
- ✅ 光晕在星球外围正确显示
- ✅ Skybox 背景正常渲染
- ✅ 无控制台错误
- ✅ 重复点击不同实例均正常工作

---

## 经验教训

### 做得好的地方 ✅
1. **全面修复**: 一次性识别并修复所有相关问题
2. **详细文档**: Commit message 详细记录了每个 bug 和修复方案
3. **调试总结**: 记录了调试耗时的原因，为后续改进提供依据

### 需要改进的地方 ⚠️
1. **API 使用错误**: Three.js API 相似名称导致误用（setLength vs set）
2. **静默失败**: 缺少运行时检查，bug 未在控制台报错
3. **多点失败**: 多个独立 bug 同时存在，增加调试复杂度
4. **缺乏测试**: 核心交互功能无自动化测试覆盖
5. **模块导出混乱**: 全局变量导出缺乏统一管理

### 核心教训 💡

#### 1. Three.js API 陷阱
```javascript
// Vector3 有多个 scale 相关方法，行为完全不同：
vector.setLength(10)          // 设置向量长度为 10
vector.set(10, 10, 10)        // 设置各分量为 10
vector.multiplyScalar(10)     // 各分量乘以 10
```

**教训**: 相似 API 需要特别注意文档，TypeScript 可以避免此类错误。

#### 2. 嵌套对象的独立缩放
```javascript
// 父对象缩放不会自动应用到子对象的本地缩放
parent.scale.set(5, 5, 5);
child.scale.set(1, 1, 1);  // 需要显式设置
```

**教训**: 3D 场景图中的变换需要考虑层级关系。

#### 3. 模块化导出策略
```javascript
// 缺乏统一的全局变量管理
window.enableStarModel = enableStarModel;  // 临时方案
window.renderer = renderer;                 // 技术债

// 更好的方案：
export { enableStarModel, renderer };       // ES6 模块
```

**教训**: 需要明确的模块边界和导出策略。

---

## 预防措施

### 立即行动 (已完成)
- [x] 修复所有相关 bug
- [x] 验证修复效果
- [x] 记录详细的 commit message

### 短期措施 (1-2 周)
- [ ] **添加集成测试**: 为星球模型显示添加端到端测试
- [ ] **代码审查清单**: 包含 Three.js API 使用规范
- [ ] **运行时断言**: 关键渲染路径添加 console.assert
- [ ] **文档化**: 创建 Three.js API 易错点文档

### 中期措施 (1-2 月)
- [ ] **引入 TypeScript**: 提供编译时类型检查
- [ ] **统一模块导出**: 重构全局变量为 ES6 模块
- [ ] **可视化回归测试**: 使用 Percy 或 Chromatic 捕获视觉变化
- [ ] **监控和告警**: 添加前端错误追踪（如 Sentry）

### 长期措施 (3-6 月)
- [ ] **测试覆盖率目标**: 核心交互功能达到 80% 覆盖率
- [ ] **架构重构**: 消除对 window 全局变量的依赖
- [ ] **开发工具**: 创建 3D 调试工具可视化坐标系和缩放
- [ ] **团队培训**: Three.js 最佳实践和常见陷阱

---

## 相关资源

### 代码引用
- 修复 commit: [`ad2b3a5`](../commits/ad2b3a522c6a54b117c325e94c888324c662f44a)
- 受影响文件: src/js/core/sun.js:setScale()

### 技术文档
- [Three.js Vector3 API](https://threejs.org/docs/#api/en/math/Vector3)
- [Three.js Object3D.scale](https://threejs.org/docs/#api/en/core/Object3D.scale)
- [Three.js 渲染顺序](https://threejs.org/docs/#manual/en/introduction/FAQ)

### 相关讨论
- Three.js GitHub: "Difference between setLength and set methods"

---

## 附录

### A. 调试时间分析

**总调试时间**: 约 3-4 小时（估计）

**时间分布**:
1. 坐标系统理解偏差: 30%
2. 定位 API 使用错误: 25%
3. 发现作用域/导出问题: 20%
4. 渲染顺序调试: 15%
5. 测试和验证: 10%

**关键洞察**: 多个独立 bug 叠加使得问题定位困难，需要逐一排查。

### B. 风险评估矩阵

| 风险类型 | 概率 | 影响 | 风险级别 | 缓解措施 |
|---------|------|------|---------|---------|
| 类似 API 误用再次发生 | 高 | 中 | 🟠 高 | TypeScript + Lint 规则 |
| 全局变量导出遗漏 | 中 | 高 | 🟠 高 | ES6 模块重构 |
| 嵌套对象缩放问题 | 低 | 中 | 🟡 中 | 3D 调试工具 |
| 渲染顺序回归 | 低 | 低 | 🟢 低 | 集成测试覆盖 |

### C. 术语表

- **P0**: Priority 0，最高优先级，核心功能完全失效
- **Three.js**: 3D 图形库
- **Skybox**: 天空盒，模拟远景背景
- **Gyro**: 陀螺仪，此处指围绕星球旋转的光晕容器
- **Window scope**: 浏览器全局作用域

---

**审核人**: _待填写_  
**批准人**: _待填写_  
**文档版本**: 1.0  
**最后更新**: 2026-01-12
