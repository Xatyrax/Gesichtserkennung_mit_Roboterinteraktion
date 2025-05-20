@echo off

REM Setze Pfad zu deiner Miniconda-Installation:
SET \"CONDA_PATH=C:\\Users\\Derrin\\miniconda3\"

CALL \"%CONDA_PATH%\\Scripts\\activate.bat\" %CONDA_PATH%\\envs\\faceenv

cd /d \"%~dp0\"

echo -------------------------------------
echo ✅ Umgebung faceenv ist aktiviert!
echo 💡 Du bist jetzt im Projektordner:
echo %cd%
echo -------------------------------------
echo Starte dein Python-Programm mit:
echo python main.py
echo -------------------------------------

cmd /K
