@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM File Browser (v3.0.0-HY fork) build pipeline
REM
REM Steps:
REM   1. Frontend: pnpm typecheck + vite build   -> frontend/dist
REM   2. Backend: cross-compile linux/amd64      -> filebrowser (for Dockerfile COPY)
REM   3. Backend: build Windows binary           -> filebrowser.exe
REM   4. Package linux binary                    -> filebrowser-v3.0.0-HY-amd64.tar.gz
REM   5. Docker: build image filebrowser:v3.0.0-HY (+ latest)
REM
REM To (re)create the local container from the new image, run run.bat.
REM ============================================================

REM ---------- configuration ----------
set "IMAGE_NAME=filebrowser"
set "IMAGE_TAG=v3.0.0-HY"
set "APP_VERSION=3.0.0-HY"

REM nvm-windows node install dir (node/pnpm live here); update after node upgrade
set "NODE_HOME=D:\Software\Scoop\scoop\persist\nvm\nodejs\v24.19.0"
REM --------------------------------------

set "REPO=%~dp0"
set "FRONTEND=%REPO%frontend"

echo.
echo ====== [1/5] Frontend build (typecheck + vite build) ======
if not exist "%NODE_HOME%\node.exe" (
    echo [ERROR] node not found at: %NODE_HOME%
    echo Fix NODE_HOME in this script and retry.
    goto :error
)
set "PATH=%NODE_HOME%;%PATH%"

cd /d "%FRONTEND%"
call corepack pnpm run typecheck || goto :error
call corepack pnpm exec vite build || goto :error
if not exist "%FRONTEND%\dist\index.html" (
    echo [ERROR] frontend build output missing: %FRONTEND%\dist\index.html
    goto :error
)

echo.
echo ====== [2/5] Backend cross-compile linux/amd64 ======
cd /d "%REPO%"
set "CGO_ENABLED=0"
set "GOOS=linux"
set "GOARCH=amd64"
go build -ldflags="-s -w -X github.com/filebrowser/filebrowser/v2/version.Version=%APP_VERSION%" -o filebrowser . || goto :error

echo.
echo ====== [3/5] Backend build windows/amd64 ======
set "GOOS=windows"
set "GOARCH=amd64"
go build -ldflags="-s -w -X github.com/filebrowser/filebrowser/v2/version.Version=%APP_VERSION%" -o filebrowser.exe . || goto :error

echo.
echo ====== [4/5] Package linux binary tar.gz ======
if exist "filebrowser-%IMAGE_TAG%-amd64.tar.gz" del "filebrowser-%IMAGE_TAG%-amd64.tar.gz"
tar -czf "filebrowser-%IMAGE_TAG%-amd64.tar.gz" filebrowser || goto :error
echo Created filebrowser-%IMAGE_TAG%-amd64.tar.gz

echo.
echo ====== [5/5] Build Docker image ======
docker build -t %IMAGE_NAME%:%IMAGE_TAG% -t %IMAGE_NAME%:latest "%REPO%." || goto :error

echo.
echo ====== Done ======
echo Image: %IMAGE_NAME%:%IMAGE_TAG%
echo Run run.bat to recreate the container from this image.
goto :done

:error
echo.
echo [FAILED] build aborted. Exit code: %ERRORLEVEL%
exit /b 1

:done
echo.
endlocal
