@echo off
:: 解除 .kln 文件关联（管理员运行）

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请以管理员身份运行！
    pause
    exit /b 1
)

echo 解除 .kln 文件关联...
reg delete "HKCR\.kln" /f >nul 2>&1
reg delete "HKCR\NodeLink.kln" /f >nul 2>&1
echo 完成。
pause
