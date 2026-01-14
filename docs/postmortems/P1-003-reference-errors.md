# Postmortem Report: 引用错误导致的运行时崩溃

**事故编号**: INC-016
**严重级别**: P1 (High - 功能不可用)
**发生时间**: 2026-01-12
**影响时长**: ~1小时
**负责人**: r0k1s#i
**状态**: ✅ 已解决

---

## 执行摘要

本项目在进行代码清理和模块化重构过程中，由于**删除文件不彻底**和**变量声明遗漏**，引发了两次独立的 ReferenceError 事故。这导致部分功能（如调试工具初始化、Minimap 导览）在运行时崩溃，并在控制台抛出 404 或 ReferenceError。

---

## 事故时间线

| 时间 | 事件 |
|------|------|
| 2026-01-12 14:48 | 发现 Minimap 报错 `ReferenceError: tourEl is not defined` |
| 2026-01-12 14:48 | 修复 `tourEl` 声明 (commit `5988814`) |
| 2026-01-12 17:19 | 移除 `debug-tools.js` 文件 (commit `8bd493a`) |
| 2026-01-12 17:20 | 发现 `main.js` 仍尝试导入已删除的文件，导致 404 |
| 2026-01-12 17:20 | 修复 `main.js` 中的导入引用 (commit `9a11f80`) |

---

## 事故详情

### 1. 调试工具 404 错误
- **现象**: 浏览器控制台报错 `GET .../src/js/utils/debug-tools.js 404 (Not Found)`，且由于是模块导入失败，`main.js` 停止执行，整个应用白屏。
- **根本原因**: 在 `8bd493a` 提交中物理删除了文件，但未检查并移除所有引用该文件的 import 语句。

### 2. tourEl 未定义错误
- **现象**: 运行时报错 `ReferenceError: tourEl is not defined`。
- **根本原因**: 在重构 `minimap.js` 时，移除了 `tourEl` 的全局声明，但代码中仍有赋值或使用逻辑。

---

## 修复方案

### 修复提交
1. **Debug Tools**: `9a11f80` - `fix: remove debug-tools.js references causing 404`
2. **Minimap**: `5988814` - `fix: declare missing tourEl variable to prevent ReferenceError`

### 验证结果
- ✅ 应用正常加载，无 404 错误
- ✅ 控制台无 ReferenceError

---

## 经验教训

### 核心教训
1. **删除文件前必 Grep**: 删除任何文件前，必须全局搜索该文件名，确保无残留引用。
2. **ESLint 的重要性**: `no-undef` 规则可以轻易捕获 `tourEl` 未定义的问题。
3. **模块化依赖**: ES Modules 的静态导入特性意味着一个文件的缺失会导致入口文件完全失效，这比传统的 `<script>` 标签更脆弱但也更严谨。

### 预防措施
- [ ] **代码规范**: 配置 ESLint `no-undef` 和 `import/no-unresolved` 规则。
- [ ] **重构流程**: 建立"搜索 -> 修改引用 -> 删除文件"的标准重构流程。
