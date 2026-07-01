# 08. 构建 exe

## 构建命令

```bash
npm run tauri build
```

首次构建需要编译 Rust 依赖，约 5-15 分钟。

## 输出位置

```
src-tauri/target/release/bundle/
├── msi/          # Windows 安装包
│   └── KnotLink_0.1.0_x64.msi
└── nsis/         # NSIS 安装包（如有）
    └── KnotLink_0.1.0_x64-setup.exe
```

## 前置要求

- Rust 1.85+（`rustup default stable`）
- Windows 10/11 + WebView2（系统自带）
- Visual Studio Build Tools（C++ 编译工具，安装 Rust 时通常已包含）

## 已知构建问题

### time crate 不兼容

症状：`cookie 0.18.1` 编译错误

```toml
# src-tauri/Cargo.toml
[dependencies]
time = "=0.3.36"
```

### 拖拽不工作

症状：打包后节点拖不到画布上

```json
// src-tauri/tauri.conf.json
"windows": [{ "dragDropEnabled": false }]
```

## 使用技巧

### 文件关联

安装后 `.kln` 文件自动关联，双击打开。

### 拖文件打开

将 `.kln` 文件拖到 `KnotLink.exe` 图标上即可打开。

### 功能包管理

exe 旁边的 `funclist/` 目录可以随时增删功能包文件夹，重启生效。

> 📸 **截图 7**：exe 目录结构（exe + funclist/）
