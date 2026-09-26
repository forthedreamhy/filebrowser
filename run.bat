@echo off
setlocal

REM ============================================================
REM File Browser (v3.0.0-HY fork) - recreate the local container
REM from the image built by build.bat.
REM
REM Stops/removes the existing container, then starts a new one
REM with the same port and volume mounts as before.
REM ============================================================

REM ---------- configuration (keep in sync with build.bat) ----------
set "IMAGE_NAME=filebrowser"
set "IMAGE_TAG=v3.0.0-HY"
set "CONTAINER_NAME=filebrowser"
set "HOST_PORT=20090"
set "DATA_DIR=D:\Data\Docker\ContainerData\filebrowser"
REM ------------------------------------------------------------------

docker rm -f %CONTAINER_NAME% >nul 2>&1
docker run -d --name %CONTAINER_NAME% --restart always ^
    -p %HOST_PORT%:80 ^
    -v "%DATA_DIR%\config:/config" ^
    -v "%DATA_DIR%\database:/database" ^
    -v "%DATA_DIR%\srv:/srv" ^
    %IMAGE_NAME%:%IMAGE_TAG% || goto :error

ping -n 3 127.0.0.1 >nul
docker logs --tail 5 %CONTAINER_NAME%

echo.
echo ====== Done ======
echo URL: http://127.0.0.1:%HOST_PORT%/
echo Remember to hard-refresh the browser (Ctrl+F5) to load new frontend assets.
goto :done

:error
echo.
echo [FAILED] container start failed. Exit code: %ERRORLEVEL%
exit /b 1

:done
echo.
endlocal
