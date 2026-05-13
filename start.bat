@echo off
title Projekt Manager

:menu
cls
echo ==========================================
echo  PROJEKT STEUERUNG (PB + SVELTE + MAILER)
echo ==========================================
echo 1) Alles starten (Backend + Frontend + Microservice)
echo 2) Nur Backend starten (PocketBase)
echo 3) Nur Frontend starten (SvelteKit)
echo 4) Nur Email-Microservice starten (Node.js)
echo 5) Update (Pocketbase)
echo 6) Update (Svelte)
echo 7) Update (Microservice)
echo 8) Frontend Builden und ins Backend kopieren (pb_public)
echo 9) Beenden
echo ==========================================
set /p choice="Waehle eine Option: "

if "%choice%"=="1" goto all
if "%choice%"=="2" goto backend
if "%choice%"=="3" goto frontend
if "%choice%"=="4" goto microservice
if "%choice%"=="5" goto updateback
if "%choice%"=="6" goto updatefront
if "%choice%"=="7" goto updatemicro
if "%choice%"=="8" goto build
if "%choice%"=="9" exit

:all
echo Starte Backend...
start "PocketBase Backend" cmd /k "cd backend && pocketbase.exe serve ihre-seniorenassistenz.com"

echo Starte Email Microservice...
start "Email Microservice" cmd /k "cd microservice && npm run dev"

echo Starte Frontend...
start "SvelteKit Frontend" cmd /k "cd frontend && npm run dev -- --host --open"
goto menu

:backend
start "PocketBase Backend" cmd /k "cd backend && pocketbase.exe serve ihre-seniorenassistenz.com"
goto menu

:frontend
start "SvelteKit Frontend" cmd /k "cd frontend && npm run dev -- --host --open"
goto menu

:microservice
start "Email Microservice" cmd /k "cd microservice && npm run dev"
goto menu

:updateback
start "Pocketbase Update" cmd /k "cd backend && pocketbase update && cd ..\ && exit"
goto menu

:updatefront
start "Svelte Update" cmd /k "cd frontend && npm update && cd ..\ && exit"
goto menu

:updatemicro
start "Microservice Update" cmd /k "cd microservice && npm update && cd ..\ && exit"
goto menu

:build
echo ==========================================
echo Erstelle Frontend-Build...
cd frontend
call npm run build
cd ..
echo.
echo Kopiere Build-Dateien in das Backend (pb_public)...
if exist "backend\pb_public" rmdir /s /q "backend\pb_public"
mkdir "backend\pb_public"

if exist "frontend\pb_public" (
    xcopy "frontend\pb_public\*" "backend\pb_public\" /E /I /Y /H /C
) else if exist "frontend\build" (
    xcopy "frontend\build\*" "backend\pb_public\" /E /I /Y /H /C
) else (
    echo [FEHLER] Konnte keinen Build-Ordner (build oder pb_public) im Frontend finden!
)
echo.
echo Build und Kopiervorgang erfolgreich abgeschlossen!
pause
goto menu