@echo off
title Zombie Apocalypse - WWZ Aftermath
echo ========================================================
echo   STARTING ZOMBIE APOCALYPSE (WWZ AFTERMATH EDITION)
echo ========================================================
echo Launching local server and opening your browser...
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo Python not found in path, opening index.html directly...
    start index.html
)
pause
