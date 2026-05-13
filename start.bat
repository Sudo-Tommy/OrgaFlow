@echo off
setlocal EnableDelayedExpansion
title OrgaFlow - Server Management Tool

:: --- CONFIGURATION ---
set "PROJECT_ROOT=%~dp0"
set "VERSION_FILE=%PROJECT_ROOT%version.txt"
set "BACKUP_DIR=%PROJECT_ROOT%..\OrgaFlow_Backups"
set "NGINX_DIR=S:\nginx-1.30.0"

:: --- INIT VERSION ---
if not exist "%VERSION_FILE%" echo 0 > "%VERSION_FILE%"
set /p BUILD_VER=<"%VERSION_FILE%"
set "APP_VERSION=1.0.!BUILD_VER!"

:menu
cls
echo ========================================================
echo   OrgaFlow Server Management Tool v!APP_VERSION!
echo ========================================================
echo.
echo  [ START MODI ]
echo   1) DEV-Modus (Backend + Svelte Dev + Mailer Dev)
echo   2) LIVE-Modus (Backend hostet pb_public + Mailer)
echo   X) Alle Server beenden (DEV ^& LIVE schliessen)
echo.
echo  [ BUILD ^& DEPLOY ]
echo   3) Frontend Builden ^& in Backend (pb_public) kopieren
echo.
echo  [ UPDATES ]
echo   4) Komplettes Update (PB + Svelte + Node) ^& Version++
echo   5) Nur PocketBase Update
echo   6) Nur Frontend (Svelte) Update
echo   7) Nur Microservice (Node) Update
echo.
echo  [ SYSTEM ]
echo   8) 1:1 Projekt-Backup erstellen (Mirror)
echo   9) Version manuell erhoehen
echo.
echo  [ NGINX STEUERUNG ]
echo   A) Nginx starten
echo   B) Nginx Config neu laden (reload)
echo   C) Nginx beenden (quit)
echo   0) Beenden
echo ========================================================
set /p choice="Waehle eine Option: "

if "%choice%"=="1" goto start_dev
if "%choice%"=="2" goto start_live
if /i "%choice%"=="X" goto kill_all
if "%choice%"=="3" goto build
if "%choice%"=="4" goto update_all
if "%choice%"=="5" goto update_pb
if "%choice%"=="6" goto update_front
if "%choice%"=="7" goto update_micro
if "%choice%"=="8" goto backup
if "%choice%"=="9" goto bump_version
if /i "%choice%"=="A" goto nginx_start
if /i "%choice%"=="B" goto nginx_reload
if /i "%choice%"=="C" goto nginx_stop
if "%choice%"=="0" exit

goto menu

:start_dev
echo Starte Backend (Dev)...
start "PocketBase Backend" cmd /k "cd backend && pocketbase.exe serve ihre-seniorenassistenz.com"
echo Starte Microservice (Dev)...
start "Email Microservice" cmd /k "cd microservice && npm run dev"
echo Starte Frontend (Dev)...
start "SvelteKit Frontend" cmd /k "cd frontend && npm run dev -- --host --open"
goto menu

:start_live
echo Starte LIVE Backend (PocketBase auf Port 8090)...
start "OrgaFlow PB (LIVE)" cmd /k "cd backend && pocketbase.exe serve --http=127.0.0.1:8090"
echo Starte LIVE Microservice...
start "OrgaFlow Mailer (LIVE)" cmd /k "cd microservice && node index.js"
echo Starte Nginx Proxy...
cd /d "%NGINX_DIR%"
start "" nginx.exe
cd /d "%PROJECT_ROOT%"
goto menu

:kill_all
echo ==========================================
echo Beende alle laufenden Server-Prozesse...
:: Schliesst die Konsolenfenster anhand ihrer Titel
taskkill /F /FI "WINDOWTITLE eq PocketBase Backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Email Microservice*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq SvelteKit Frontend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq OrgaFlow PB (LIVE)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq OrgaFlow Mailer (LIVE)*" /T >nul 2>&1

echo Beende Nginx Proxy...
cd /d "%NGINX_DIR%"
nginx.exe -s quit >nul 2>&1
taskkill /F /IM nginx.exe >nul 2>&1
cd /d "%PROJECT_ROOT%"

echo Alle Server wurden erfolgreich beendet!
pause
goto menu

:build
echo ==========================================
echo Erstelle Frontend-Build...
cd frontend
call npm run build
cd ..
echo.
echo Loesche alten pb_public Ordner im Backend...
if exist "backend\pb_public" rmdir /s /q "backend\pb_public"
mkdir "backend\pb_public"

echo Kopiere neue Build-Dateien 1:1 nach backend\pb_public...
if exist "frontend\build" (
    xcopy "frontend\build\*" "backend\pb_public\" /E /I /Y /H /C
) else if exist "frontend\pb_public" (
    xcopy "frontend\pb_public\*" "backend\pb_public\" /E /I /Y /H /C
) else (
    echo [FEHLER] Konnte keinen Build-Ordner finden!
)
echo.
echo Build und Kopiervorgang erfolgreich!
pause
goto menu

:update_all
echo ==========================================
echo [1/3] PocketBase Update...
cd backend && call pocketbase update
echo [2/3] SvelteKit Update...
cd ..\frontend && call npm update
echo [3/3] Microservice Update...
cd ..\microservice && call npm update
cd ..
call :increment_version
echo ==========================================
echo Alle Updates abgeschlossen!
pause
goto menu

:update_pb
cd backend && call pocketbase update && cd ..
pause
goto menu

:update_front
cd frontend && call npm update && cd ..
pause
goto menu

:update_micro
cd microservice && call npm update && cd ..
pause
goto menu

:backup
echo ==========================================
echo Erstelle 1:1 Mirror Backup...
:: Sichere Zeitformatierung fuer Dateinamen erstellen (auch fuer deutsche Windows-Versionen)
set "HH=%time:~0,2%"
if "%HH:~0,1%"==" " set "HH=0%HH:~1,1%"
set "TIMESTAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%HH%-%time:~3,2%-%time:~6,2%"

set "CURRENT_BACKUP_DIR=%BACKUP_DIR%\OrgaFlow_Backup_%TIMESTAMP%"
mkdir "%CURRENT_BACKUP_DIR%"

echo Spiegel Projekt nach: %CURRENT_BACKUP_DIR%
:: Robocopy erstellt einen exakten Spiegel. Temporaere Build/Node-Ordner werden ausgelassen.
robocopy "%PROJECT_ROOT:~0,-1%" "%CURRENT_BACKUP_DIR%" /MIR /XD "node_modules" ".svelte-kit" "build" /R:1 /W:1
echo.
echo Backup erfolgreich gespeichert!
pause
goto menu

:bump_version
call :increment_version
pause
goto menu

:increment_version
set /a BUILD_VER+=1
echo !BUILD_VER! > "%VERSION_FILE%"
set "APP_VERSION=1.0.!BUILD_VER!"
echo Version wurde auf !APP_VERSION! erhoeht!
exit /b

:nginx_start
echo Starte Nginx...
cd /d "%NGINX_DIR%" && start nginx.exe
cd /d "%PROJECT_ROOT%"
goto menu

:nginx_reload
echo Lade Nginx Konfiguration neu...
cd /d "%NGINX_DIR%"
nginx.exe -t
if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] Deine nginx.conf hat einen Syntax-Fehler! Nginx wurde NICHT neu geladen.
    pause
    cd /d "%PROJECT_ROOT%"
    goto menu
)
nginx.exe -s reload
echo Nginx erfolgreich neu geladen!
cd /d "%PROJECT_ROOT%"
pause
goto menu

:nginx_stop
echo Beende Nginx sicher...
cd /d "%NGINX_DIR%" && nginx.exe -s quit
cd /d "%PROJECT_ROOT%"
goto menu