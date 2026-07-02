@echo off
setlocal enabledelayedexpansion
title NodeLink Installer

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Run as Administrator!
    pause & exit /b 1
)

set "SRC=%~dp0"
set "DEST=%ProgramFiles%\NodeLink"

echo.
echo ============================================
echo   NodeLink One-Click Installer
echo ============================================
echo.
echo Installing to: %DEST%

:: Step 1: Create install directory
echo [1/4] Creating directory...
mkdir "%DEST%" 2>nul

:: Step 2: Copy files
echo [2/4] Copying files...
xcopy "%SRC%NodeLink.exe" "%DEST%\" /Y /Q >nul
if exist "%SRC%funclist" xcopy "%SRC%funclist\*" "%DEST%\funclist\" /E /Y /Q >nul
if exist "%SRC%kln-file.ico" copy "%SRC%kln-file.ico" "%DEST%\" /Y >nul

:: Step 3: Register .kln
echo [3/4] Registering .kln file association...
reg add HKCR\.kln /ve /t REG_SZ /d "NodeLink.kln" /f >nul
reg add HKCR\NodeLink.kln /ve /t REG_SZ /d "NodeLink Project" /f >nul
if exist "%DEST%\kln-file.ico" (
    reg add HKCR\NodeLink.kln\DefaultIcon /ve /t REG_SZ /d "%DEST:\=\\%\\kln-file.ico" /f >nul
) else (
    reg add HKCR\NodeLink.kln\DefaultIcon /ve /t REG_SZ /d "%DEST:\=\\%\\NodeLink.exe,0" /f >nul
)
reg add HKCR\NodeLink.kln\shell\open\command /ve /t REG_SZ /d "\"%DEST:\=\\%\\NodeLink.exe\" \"%%1\"" /f >nul

:: Step 4: Start Menu shortcut
echo [4/4] Creating shortcut...
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\NodeLink.lnk');$s.TargetPath='%DEST%\NodeLink.exe';$s.WorkingDirectory='%DEST%';$s.Save()" >nul 2>&1

echo.
echo ============================================
echo   Install Complete!
echo   .kln files now open with NodeLink
echo   Start Menu: NodeLink
echo ============================================
pause
