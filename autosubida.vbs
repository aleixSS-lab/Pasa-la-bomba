' Lanza autosubida.ps1 sin abrir ninguna ventana. Lo usa la tarea programada.
Dim carpeta
carpeta = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File """ & carpeta & "\autosubida.ps1""", 0, True
