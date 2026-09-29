@echo off
rem Assistance AI - cloudflared tunnel (public URL for the APK)
rem Started by scheduled task "AssistanceAI_Tunnel" at logon (hidden window)
cd /d "C:\Users\Hp\Downloads\Agent"
cloudflared.exe tunnel --url http://localhost:3000 >> "%~dp0tunnel.log" 2>&1
