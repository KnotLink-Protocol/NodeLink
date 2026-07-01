# 07. 功能包管理

## 概念

`FuncList.json` 定义了软件的功能清单。每个软件一个文件夹，放在 exe 目录的 `funclist/` 下。

## 目录结构

```
KnotLink.exe
└── funclist/
    ├── NamePicker/
    │   └── FuncList.json
    ├── MultiTTS_Client/
    │   └── FuncList.json
    ├── Everything_node/
    │   └── FuncList.json
    └── ...
```

## FuncList.json 格式

```json
{
  "appName": "随机点名",
  "openSocket": {
    "pick": {
      "appID": "NamePicker",
      "openSocketID": "control",
      "description": "抽取一名学生",
      "args": {
        "action": {
          "type": "static",
          "value": "pick",
          "description": "命令类型"
        },
        "type": {
          "type": "optional",
          "options": [["单人", "single"]],
          "defaultVal": "single",
          "description": "抽取类型"
        }
      },
      "returns": [
        ["学生姓名", "name"],
        ["学号", "no"]
      ]
    }
  },
  "signal": {
    "onPickSingle": {
      "appID": "NamePicker",
      "signalID": "onPick",
      "description": "点名触发时",
      "returns": {
        "name": {
          "description": "姓名",
          "verification": ""
        }
      }
    }
  }
}
```

## 参数类型说明

| 类型 | 用途 | 必填字段 |
|------|------|----------|
| `static` | 固定值（不暴露给用户） | `value` |
| `optional` | 下拉选择 | `options`（[显示, 值] 对） |
| `input` | 从上个节点输入 | `defaultVal`（可选） |

## 添加新功能包

1. 在 exe 旁边的 `funclist/` 下创建新文件夹
2. 放入 `FuncList.json`（按上面的格式）
3. 重启 KnotLink
4. 新 App 和功能自动出现在左侧面板

## 已有 App 列表

| App | 功能 | 类型 |
|-----|------|------|
| NamePicker | 随机点名（单人/多人、增删改查） | openSocket |
| MultiTTS | 语音合成（系统TTS/EdgeTTS/GPT_SoVITS） | openSocket |
| MsgNotification | 弹出消息窗口 | openSocket |
| Everything_node | 文件搜索 | openSocket |
| system_monitor_win | 系统资源监控 | openSocket |
| ClassIsland-信 | 信号通知 | signal |

> 📸 **截图 6**：funclist 目录结构

---

下一步：[08. 构建 exe](08-tauri-build.md)
