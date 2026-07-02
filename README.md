<div align="center">

<img src="src-tauri/icons/icon.svg" width="128" height="128" />

# NodeLink — 可视化节点编排器

🧩 **拖拽连线** | 🐍 **生成 Python 代码** | 🖥️ **Tauri 桌面应用**

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge)
![Platform: Windows](https://img.shields.io/badge/Platform-Windows-3B82F6?style=for-the-badge)
![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri-FFC131?style=for-the-badge&logo=tauri)

</div>

---

> NodeLink 基于 [KnotLink](https://github.com/KnotLink-Protocol) 通信协议，通过可视化节点编排 IoT/自动化工作流，一键生成 Python 代码。使用 [Claude Code](https://claude.ai/claude-code) 辅助开发。

---

## 📖 目录

- [快速开始](#-快速开始)
- [核心亮点](#-核心亮点)
- [界面预览](#-界面预览)
- [项目结构](#-项目结构)
- [文档](#-文档)
- [技术栈](#-技术栈)
- [构建桌面应用](#-构建桌面应用)
- [许可证](#-许可证)

## 🚀 快速开始

```bash
npm install
npm run dev        # 浏览器开发模式
npm run tauri build  # 打包 Windows exe
```

## 🌟 核心亮点

### 🧩 可视化编排

- ✅ **拖拽节点**：从左侧面板拖入功能节点，连线构建工作流
- ✅ **funcList 驱动**：exe 目录下 `funclist/` 文件夹定义可用功能，增删即生效
- ✅ **触发流 + 数据流**：支持信号触发执行和参数数据传递两种连接模式
- ✅ **回调嵌套**：被动源节点（信号订阅）自动生成回调嵌套代码

### 🐍 代码生成

- ✅ **一键生成**：点击按钮自动生成完整 Python 脚本
- ✅ **KLKVMap 序列化**：参数自动序列化为 KnotLink 通信格式
- ✅ **信号校验**：支持 verification 字段校验，不匹配自动跳过
- ✅ **可直接运行**：生成的代码包含 import、回调注册、保活循环

### 🖥️ 桌面应用

- ✅ **原生体验**：Tauri v2 打包，体积小、启动快
- ✅ **文件关联**：`.kln` 工程文件双击打开
- ✅ **拖拽打开**：`.kln` 文件拖到 exe 图标即可加载
- ✅ **原生对话框**：保存/打开使用系统文件对话框

### 📦 工程管理

- ✅ **新建/打开/保存/另存为**：标准编辑器文件操作
- ✅ **修改标记**：未保存修改显示 `*`
- ✅ **自动保存**：localStorage 缓存工作区
- ✅ **功能包管理**：运行时加载/卸载 funcList

## 📸 界面预览

<details>
<summary>展开查看截图</summary>

<div align="center">

*（截图待补充 — 见 docs/ 中各章节标注位置）*

</div>

</details>

## 📂 项目结构

```
NodeLink/
├── src/
│   ├── Node/
│   │   ├── FuncNode/       # 动态业务节点
│   │   ├── BaseNode/       # Handle/Header 基础组件
│   │   ├── KnotLink/       # 底层协议节点
│   │   ├── Programming/    # 编程教学节点
│   │   └── NodeBoard/      # NavBar + NodeGraph 主组件
│   └── utils/
│       ├── funcListParser.ts  # funclist 解析 + 动态注册
│       ├── codeGenerator.ts   # Python 代码生成器
│       └── klnPack.ts         # .kln 工程打包/解包
├── src-tauri/              # Tauri Rust 后端
│   └── src/lib.rs           # get_funclists / 文件读写命令
├── docs/                   # 用户文档（8 模块）
└── funclist/               # （已外置到 exe 目录）
```

## 📄 文档

| 模块 | 内容 |
|------|------|
| [快速入门](docs/01-getting-started.md) | 安装、启动、第一个工作流 |
| [界面概览](docs/02-interface.md) | 菜单栏、侧边栏、画布、工具栏 |
| [节点类型](docs/03-nodes.md) | 业务节点、通信节点、编程节点 |
| [连线与执行流](docs/04-workflows.md) | 数据流 vs 触发流、回调嵌套 |
| [生成代码](docs/05-code-generation.md) | 生成、查看、复制 Python 代码 |
| [工程管理](docs/06-projects.md) | 新建/打开/保存 .kln 文件 |
| [功能包](docs/07-funclist.md) | funclist 目录结构与格式 |
| [构建 exe](docs/08-tauri-build.md) | Tauri 打包与踩坑记录 |

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + TailwindCSS 4 |
| 画布 | @xyflow/react 12.9 |
| 桌面 | Tauri v2 (Rust) |
| 打包 | jszip（.kln 工程文件） |
| 图标 | FontAwesome 7 |
| AI 辅助 | [Claude Code](https://claude.ai/claude-code) |

## 🔨 构建桌面应用

```bash
npm run tauri build
# 输出: src-tauri/target/release/bundle/msi/
```

前置要求：Rust 1.85+、Windows WebView2（系统自带）

## 📚 开源库与致谢

NodeLink 基于以下开源项目构建：

| 库 | 用途 | 许可证 |
|----|------|--------|
| [React](https://react.dev/) | UI 框架 | MIT |
| [@xyflow/react](https://reactflow.dev/) | 节点画布引擎 | MIT |
| [Vite](https://vitejs.dev/) | 构建工具 | MIT |
| [TailwindCSS](https://tailwindcss.com/) | CSS 框架 | MIT |
| [Tauri](https://tauri.app/) | 桌面应用框架 | MIT / Apache-2.0 |
| [JSZip](https://stuk.github.io/jszip/) | .kln 工程打包 | MIT / GPL-3.0 |
| [FontAwesome](https://fontawesome.com/) | 图标库 | MIT |
| [Sharp](https://sharp.pixelplumbing.com/) | 图标转换 | Apache-2.0 |

### 灵感来源

早期原型基于 [TiO2EvoLve/NodeGraph-ReactFlow](https://github.com/TiO2EvoLve/NodeGraph-ReactFlow)，在其节点编辑器风格启发下进行了完全重构和大幅扩展。

### AI 辅助

使用 [Claude Code](https://claude.ai/claude-code) (Anthropic) 作为 AI 编程辅助工具，参与了架构设计、代码生成、文档编写。

## 📜 许可证

本项目采用 [GNU General Public License v3.0](LICENSE) 开源。