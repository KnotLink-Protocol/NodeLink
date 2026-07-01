# NodeLink — KnotLink 可视化节点编排器

基于 ReactFlow 的可视化工作流编辑器，用于编排 KnotLink 通信节点并生成 Python 代码。

## 功能

- 🧩 **可视化编排**：拖拽节点、连线，构建 IoT/自动化工作流
- 🐍 **生成 Python 代码**：一键生成可直接运行的 KnotLink SDK 调用代码
- 📦 **funcList 驱动**：exe 目录下 `funclist/` 文件夹定义可用功能，增删即生效
- 💾 **工程管理**：新建/打开/保存 `.kln` 工程文件
- 🖥️ **桌面应用**：Tauri v2 打包为原生 Windows exe
- 📡 **KnotLink 协议**：支持信号（Pub/Sub）和套接字（Req/Reply）通信模型

## 快速开始

```bash
npm install
npm run dev        # 浏览器开发
npm run tauri build  # 打包 exe
```

## 文档

详见 [docs/](docs/) 目录，包含 8 个模块从入门到打包。

## 技术栈

- React 19 + TypeScript + Vite + TailwindCSS 4
- @xyflow/react 12.9（节点画布）
- Tauri v2（桌面打包）
- KnotLink SDK（Python / JavaScript）

## 许可证

MIT
