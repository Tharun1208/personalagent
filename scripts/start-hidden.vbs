' Assistance AI - hidden launcher for server + tunnel
' Runs at Windows login via the user Startup folder (no admin required)
CreateObject("Wscript.Shell").Run """C:\Users\Hp\personalagent\scripts\start-server.bat""", 0, False
CreateObject("Wscript.Shell").Run """C:\Users\Hp\personalagent\scripts\start-tunnel.bat""", 0, False
