' Lo lanza la tarea programada cada minuto. Si no hay petición de subida (.subir-ahora),
' termina sin abrir PowerShell; si la hay, ejecuta autosubida.ps1 sin abrir ventanas.
Dim fso, carpeta
Set fso = CreateObject("Scripting.FileSystemObject")
carpeta = fso.GetParentFolderName(WScript.ScriptFullName)
If fso.FileExists(carpeta & "\.subir-ahora") Then
  CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File """ & carpeta & "\autosubida.ps1""", 0, True
End If
