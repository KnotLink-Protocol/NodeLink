# KnotLink NodeGraph — 开发日志

## 2026-06-30 ~ 2026-07-01

### 初始阶段
- 克隆 Ti O2EvoLve/NodeGraph-ReactFlow（基于 React 19 + @xyflow/react + Vite + TailwindCSS 的节点编辑器）
- 安装依赖，跑通 dev server，rolldown-vite 有兼容问题换回标准 vite

### 程序设计节点 + Python 代码生成
- 新增 7 个编程节点：ValueNode / PrintNode / ArithmeticNode / CompareNode / VariableNode / IfNode / LoopNode
- 实现拓扑排序 + 代码生成器，自动生成 Python 脚本
- 底部代码面板，可复制生成的 Python

### KnotLink SDK 集成
- 分析 knotlink-sdk-js / knotlink-sdk-python 两个 SDK
- 通信模型：SignalSender(6370) / SignalSubscriber(6372) / OpenSocketQuerier(6376) / OpenSocketResponser(6378)
- KLUDF/KLKVMap 统一数据格式层（key=value;key=value 序列化协议）
- 新增 KnotLink 通信节点：SignalSenderNode / SignalSubscriberNode / OpenSocketQuerierNode / OpenSocketResponserNode

### funcList 动态节点架构（重大重构）
- funcList.json 定义了应用的 API：openSocket（请求/响应）和 signal（发布/订阅）
- args 三种类型：static（固定值）→ 不显示 / optional（下拉）→ select / input（连线输入）→ InputHandle
- 解析器：从浏览器 import.meta.glob → Tauri 改为 Rust 命令 get_funclists() 扫描 exe 目录
- FuncNode：通用动态节点组件，读取 funcList 元数据自动渲染
- NavBar：动态分类，每个 App 一个折叠区
- NodeGraph：动态注册 nodeTypes

### 代码生成器演进
- openSocket → KLKVMap + OpenSocketQuerier.query()
- signal 订阅 → SignalSubscriber + KLKVMap.deserialize() + 回调嵌套
- 被动源（无输入边的 SignalSub/Responser/signal）→ def callback(data): 嵌套下游节点
- 信号校验：if not (field == expect): return 提前退出
- 变量名：safeId() + shortName()
- 函数名匹配 Python SDK：query/set_RecvFunc/sendBack

### 编辑器化
- 侧边栏固定宽度 240px（w-60），overflow-y-auto 独立滚动
- 折叠区组件（CollapseSection），默认展开
- 文件操作：新建/打开/保存/另存为
- 修改标记（*）
- 文件名显示（displayName vs currentFile 分离）
- 快捷键支持 Ctrl+N/O/S/G/`

### Tauri 打包
- 添加 Tauri v2 脚手架
- time crate 降级到 0.3.36（兼容 cookie 0.18.1 + Rust 1.93）
- 文件关联 .kln
- 原生对话框：@tauri-apps/plugin-dialog + @tauri-apps/plugin-fs
- 拖拽修复：dragDropEnabled: false（关闭 WebView2 原生拖拽）
- 自定义鼠标拖拽方案（后来回退，dragDropEnabled: false 解决了根本问题）

### 文件系统与权限（踩坑记录）
- dialog 选中的文件有自动 scope，writeFile/readFile 正常
- 拖入 exe 的路径没有 scope → forbidden path 错误
- 解决：Rust 命令 read_startup_file / write_file 绕过 Tauri fs 权限
- capabilities: fs:write-all + fs:read-all

### 全局包 vs 工程包（已简化）
- 最初的区分（后来取消）：全局包（exe/funclist/）vs 工程包（加载/导入）
- 最终方案：funclist 统一从 exe 目录加载，.kln 文件只负责 workspace + 代码，apps 只包含在导出中但不参与导入注册

### 当前状态
- 打包命令：npm run tauri build
- 构建输出：src-tauri/target/release/bundle/msi/
- 默认打开空白画布
- 拖 .kln 到 exe 可以打开
- 保存/另存为通过原生对话框
