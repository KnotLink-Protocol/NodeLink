@echo off
:: Run as Administrator!
:: Registers .kln file association with NodeLink.exe

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Run as Administrator!
    pause
    exit /b 1
)

set "EXE_DIR=%~dp0"
set "EXE=%EXE_DIR%NodeLink.exe"

if not exist "%EXE%" (
    echo ERROR: NodeLink.exe not found at %EXE%
    pause
    exit /b 1
)

echo Registering .kln association...
echo EXE: %EXE%

reg add HKCR\.kln /ve /t REG_SZ /d "NodeLink.kln" /f
reg add HKCR\NodeLink.kln /ve /t REG_SZ /d "NodeLink Project" /f
if exist "%EXE_DIR%kln-file.ico" (
    reg add HKCR\NodeLink.kln\DefaultIcon /ve /t REG_SZ /d "\"%EXE_DIR%kln-file.ico\"" /f
) else (
    reg add HKCR\NodeLink.kln\DefaultIcon /ve /t REG_SZ /d "\"%EXE%\",0" /f
)
reg add HKCR\NodeLink.kln\shell\open\command /ve /t REG_SZ /d "\"%EXE%\" \"%%1\"" /f

echo Done. Double-click .kln to open with NodeLink.
pause
