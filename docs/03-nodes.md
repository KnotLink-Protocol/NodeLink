# 03. 节点类型

## 业务功能节点（📦）

从 exe 目录 `funclist/` 自动加载，每个 App 对应一组功能。

### 节点结构

```
┌──────────────────┐
│   函数名          │ ← 标题栏（彩色）
│ ○ 触发 (灰色)     │ ← 仅无输入参数的节点有
│ function: [下拉]  │ ← optional 类型参数
│ ○ query: [输入]   │ ← input 类型参数
│ ○ files: →        │ ← 输出口
│ ○ count:  →       │
└──────────────────┘
```

### 参数类型

| 类型 | 显示 | 说明 |
|------|------|------|
| `static` | 不显示 | 固定值，自动填入 |
| `optional` | 下拉框 | 从预定义选项中选 |
| `input` | 输入框 + Handle | 可从上游连线获取值 |

### 信号节点（📡）

```
┌──────────────────┐
│ 📡 onPickSingle  │
│ ○ name: →        │
│ ○ no:   →        │
│ ○ sex:  →        │
│ 校验: single     │
└──────────────────┘
```

- 只有输出口（收到信号后输出数据）
- `verification` 字段表示需校验的值
- 无输入——执行流由回调触发

> 📸 **截图 3**：NamePicker 的 pick 节点（无触发口）+ Everything 的 search 节点（有触发口）

---

## KnotLink 通信节点（🔌）

底层 SDK 协议节点，用于直接通信：

| 节点 | 功能 | 端口 |
|------|------|------|
| 信号发送 | SignalSender | 6370 |
| 信号订阅 | SignalSubscriber | 6372 |
| Socket请求 | OpenSocketQuerier | 6376 |
| Socket响应 | OpenSocketResponser | 6378 |

一般不需要直接使用，业务节点已封装好。

## Programming 节点（💻）

教学/调试用的通用编程节点：Value、Variable、Arithmetic、Compare、Print、If/Else、For Loop。

---

下一步：[04. 连线与执行流](04-workflows.md)
