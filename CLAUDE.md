# CLAUDE.md — NodeLink 项目指南

## 项目身份

NodeLink 是一个可视化自动化编辑器。用户拖拽功能节点到画布上，连线表达逻辑，一键生成 Python 代码。底层基于 KnotLink 通信协议，桌面端使用 Tauri v2 打包。

仓库：`https://github.com/KnotLink-Protocol/NodeLink`（private）

## 构建与运行

```bash
npm install
npm run dev          # 浏览器开发模式
npm run tauri build  # 打包 Windows exe + 安装包

# 构建前提
# - 关闭正在运行的 NodeLink.exe（否则打包阶段锁文件报错）
# - Rust 1.85+
# - Cargo.toml 中 time = "=0.3.36" 不能删！
```

安装包输出：`src-tauri/target/release/bundle/`
- `msi/NodeLink_0.1.0_x64_en-US.msi`
- `nsis/NodeLink_0.1.0_x64-setup.exe`

MSI/NSIS 安装后自动关联 `.kln` 文件。便携版需管理员运行 `register-kln.bat`。

## 架构总览

```
App.jsx
├── NavBar.tsx          # 左侧面板：可折叠节点列表
│   └── FuncNode.tsx    # 动态业务节点（openSocket/signal）
│       ├── NodeHeader  # 彩色标题栏
│       ├── TriggerBar  # 触发栏（灰入/橙出）
│       ├── InputHandle # 数据输入口
│       └── OutputHandle# 数据输出口
└── NodeGraph.tsx       # 主画布 + 工具栏 + 代码面板 + AI 面板
    └── ReactFlow       # @xyflow/react 节点画布
```

## 关键文件

| 文件 | 作用 |
|------|------|
| `src/Node/NodeBoard/NodeGraph.tsx` | **核心**。所有逻辑在此：节点/边状态、保存/打开、AI、快捷键、连线校验。尽量不跨组件。 |
| `src/utils/funcListParser.ts` | funcList 解析器。`parseAllFuncLists()` 返回所有可用 App。Tauri 通过 Rust 命令 `get_funclists` 加载 exe 旁 funclist/。浏览器用 `import.meta.glob`。 |
| `src/utils/codeGenerator.ts` | Python 代码生成器。触发边排序，数据边传参。被动源生成回调嵌套。 |
| `src/utils/aiPlanner.ts` | AI 工作流生成。把 funcList 注入 prompt → 调 LLM → 返回 nodes+edges。支持 OpenAI 兼容 API。 |
| `src/utils/klnPack.ts` | .kln 工程文件打包/解包（jszip）。项目格式：zip 内含 project.json + main.py + apps/。 |
| `src/Node/FuncNode/FuncNode.tsx` | 动态业务节点渲染。根据 funcList 元数据渲染 openSocket/signal 两种节点。 |
| `src/Node/BaseNode/TriggerHandle.tsx` | 触发栏组件。`TriggerBar({input})`：左灰色输入 + 右橙色输出。 |
| `src/Node/Edge/TriggerEdge.tsx` | 触发边：橙色虚线。EdgeWithButton 是数据边：灰色实线。 |
| `src-tauri/src/lib.rs` | Rust 命令：get_funclists, get_startup_file, read_startup_file, write_file, read_ai_config |
| `src-tauri/tauri.conf.json` | Tauri 配置：productName "NodeLink", dragDropEnabled false, fileAssociations .kln |
| `src-tauri/Cargo.toml` | 关键：`time = "=0.3.36"` 不可删！ |

## 节点体系

### 动态节点（funcList 驱动）
- `openSocket`：有输入参数（static/optional/input）+ 输出字段。每个节点顶有 TriggerBar（灰入/橙出）。
- `signal`：被动触发源。只有 TriggerBar 输出（无输入）+ 返回字段输出。信号一到自动触发下游。

### 底层通信节点
- SignalSender / SignalSubscriber（Pub/Sub）
- OpenSocketQuerier / OpenSocketResponser（Req/Reply）

### 编程节点
- Value / Variable / Arithmetic / Compare / Print / If / Loop

## 连线规则

| 边类型 | 颜色 | 作用 | Handle |
|--------|------|------|--------|
| 触发边 | 橙色虚线 | 决定执行顺序 | o-trigger → i-trigger |
| 数据边 | 灰色实线 | 传递参数值 | o-{field} → i-{arg} |

代码生成器只看触发边排序。数据边只影响变量引用，可以回环。

## 文件格式

### .kln 工程文件
zip 包内含：
- `project.json`：workspace（nodes+edges）+ generated 代码引用
- `main.py`：生成的 Python 代码
- `apps/`：自定义 funclist（导出时包含，导入时不注册）

### FuncList.json
```json
{
  "appName": "点名工具",
  "openSocket": {
    "pick": {
      "appID": "...", "openSocketID": "...",
      "description": "随机点名",
      "args": {
        "type": { "type": "optional", "options": [["单人","single"]], "defaultVal": "single" }
      },
      "returns": [["学生姓名", "name"]]
    }
  },
  "signal": {
    "onPick": {
      "appID": "...", "signalID": "...",
      "description": "点名触发时",
      "returns": { "name": { "description": "姓名", "verification": "" } }
    }
  }
}
```

## 常见踩坑

1. **跨组件状态炸了**：所有逻辑保持在 NodeGraph.tsx 内。菜单、快捷键全在这里。
2. **`window.__TAURI__` 不可靠**：用 try-catch 而非 feature detection
3. **Tauri fs scope**：dialog 选的文件有自动 scope，命令行传入的没有。用 Rust 命令绕过。
4. **构建时 app.exe 被锁**：关掉正在运行的 NodeLink.exe
5. **blob.bytes() WebView2 不支持**：用 `new Uint8Array(await blob.arrayBuffer())`
6. **触发/数据流混淆**：`splitEdges()` 自动分离。排序用 triggerEdges，解析变量用全部 edges。
7. **FuncList 信号节点不显示**：parseAllFuncLists 现在合并 glob + dynamicApps。确认 funclist/ 在项目根目录或 exe 旁。

## 设计原则

- 逻辑在 NodeGraph 内，不跨组件
- 新功能先问：能不能在 NodeGraph 内部搞定？
- 简洁直接，不搞花架子
- 用户的 AI 配置从 ai-config.json 读（Rust 命令），失败才走界面
