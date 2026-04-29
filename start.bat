@echo off
title Projekt Manager

:menu
cls
echo ==========================================
echo       PROJEKT STEUERUNG (PB + SVELTE)
echo ==========================================
echo 1) Alles starten (Backend + Frontend)
echo 2) Nur Backend starten (PocketBase)
echo 3) Nur Frontend starten (SvelteKit)
echo 4) Update (Pocketbase)
echo 5) Update (Svelte)
echo 6) Beenden
echo ==========================================
set /p choice="Waehle eine Option: "

if "%choice%"=="1" goto all
if "%choice%"=="2" goto backend
if "%choice%"=="3" goto frontend
if "%choice%"=="4" goto updateback
if "%choice%"=="5" goto updatefront
if "%choice%"=="6" exit

:all
echo Starte Backend...
start "PocketBase Backend" cmd /k "cd backend && pocketbase.exe serve"
echo Starte Frontend...
start "SvelteKit Frontend" cmd /k "cd frontend && npm run dev -- --open"
goto menu

:backend
start "PocketBase Backend" cmd /k "cd backend && pocketbase.exe serve"
goto menu

:frontend
start "SvelteKit Frontend" cmd /k "cd frontend && npm run dev -- --open"
goto menu

:updateback
start "Pocketbase Update" cmd /k "cd backend && pocketbase update && cd ..\ && exit"
goto menu

:updatefront
start "Svelte Update" cmd /k "cd frontend && npm update && cd ..\ && exit"
goto menu