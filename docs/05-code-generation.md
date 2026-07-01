# 05. 生成 Python 代码

## 操作

1. 编排好节点和连线
2. 点击右上角 **⚡ 生成 Python 代码**
3. 底部弹出代码面板
4. 点击 **📋 复制** 或手动选中复制

## 生成的代码结构

```python
import time
from knotlink import KLKVMap, OpenSocketQuerier, SignalSubscriber

time.sleep(0.5)  # 等待连接建立

# === 顶层执行 ===
kv = KLKVMap()
kv["action"] = "pick"
kv["type"] = "single"
q = OpenSocketQuerier("NamePicker", "control")
time.sleep(0.3)
result_raw = q.query(kv.serialize())

# 解析返回值
ret = KLKVMap()
ret.deserialize(result_raw)
name = ret.get("name")

# === 被动源回调 ===
sub = SignalSubscriber("App", "signal")
def on_xxx(data):
    # 嵌套的下游逻辑
    ...

sub.set_RecvFunc(on_xxx)

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    pass
```

## 代码使用

生成的代码需要安装 knotlink SDK：

```bash
pip install knotlink-2.0.0-py3-none-any.whl
```

运行时需要 KnotLink Service 在后台运行。

---

下一步：[06. 工程管理](06-projects.md)
