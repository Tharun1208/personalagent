@echo off
rem Assistance AI - background production server
rem Started by scheduled task "AssistanceAI_Server" at logon (hidden window)
cd /d "C:\Users\Hp\Downloads\Agent"
set NODE_ENV=production
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next start -p 3000 >> "%~dp0server.log" 2>&1
