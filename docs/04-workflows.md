# 04. 连线与执行流

## 数据流 vs 触发流

KnotLink 区分两种连接方式：

| 类型 | 连接方式 | 含义 |
|------|----------|------|
| **数据流** | 输出口 → input 参数 | 数据传递（如 name → text） |
| **触发流** | 输出口 → 触发口 (灰色○) | 执行触发（如信号 → pick） |

## 执行模型

### 顶层执行

有输入边、无上游被动源的节点，按拓扑顺序生成顺序代码：

```python
# 点名
q = OpenSocketQuerier("NamePicker", "control")
result = q.query("action=pick;type=single")

# TTS 播报
q2 = OpenSocketQuerier("MultiTTS", "...")
q2.query("text=张三;...")
```

### 回调嵌套

无输入边的被动源（信号订阅、Socket响应）会生成回调：

```python
sub = SignalSubscriber("NamePicker", "onPick")
def on_xxx(data):
    # 解析信号数据
    r = KLKVMap()
    r.deserialize(data)
    name = r.get("name")

    # ✨ 连到触发口的下游节点自动嵌套在这里
    q = OpenSocketQuerier("MultiTTS", "...")
    q.query(f"text={name};...")

sub.set_RecvFunc(on_xxx)

# 保活
while True:
    time.sleep(1)
```

## 触发口使用

1. 将信号节点的**输出口**连到目标节点的**灰色触发口**
2. 生成代码时，目标节点自动嵌套在信号回调中
3. 信号一到 → 自动执行目标节点

> 📸 **截图 4**：信号节点 onPickSingle → Everything.search 触发口的连线示例

---

## 连线规则

- **左进右出**：输入口在左侧，输出口在右侧
- **一个输出可以连多个输入**
- **一个输入只能接受一个输出**（拖新线会自动替换）
- 点击边中间的 ✕ 可删除连线
- `Delete` 键删除选中节点和连线

---

下一步：[05. 生成 Python 代码](05-code-generation.md)
