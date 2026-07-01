# 01. 快速入门

## 前置要求

- Node.js 20+
- Rust 1.85+（仅构建 exe 时需要）

## 安装与启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（浏览器）
npm run dev

# 3. 打开浏览器
# http://localhost:5173
```

## 构建桌面应用

```bash
npm run tauri build
# 输出: src-tauri/target/release/bundle/
```

## 第一个工作流

以"点名 → TTS 播报"为例：

1. 从左侧面板找到 **NamePicker** → 拖拽 `pick` 节点到画布
2. 从左侧面板找到 **MultiTTS** → 拖拽 `EdgeTTS` 节点到画布
3. 连接：`pick` 的 `name` 输出口 → `EdgeTTS` 的 `text` 输入口
4. 点击右上角 **⚡ 生成 Python 代码**
5. 点击 **📋 复制**，粘贴到 `.py` 文件中运行

> 📸 **截图 1**：完成后的画布，包含 pick → EdgeTTS 连线

---

下一步：[02. 界面概览](02-interface.md)
