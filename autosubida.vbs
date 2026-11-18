' Lo lanza la tarea programada cada minuto. Si no hay petición (.subir-ahora o .fusionar-main),
' termina sin abrir PowerShell; si la hay, ejecuta autosubida.ps1 sin abrir ventanas.
Dim fso, carpeta
Set fso = CreateObject("Scripting.FileSystemObject")
carpeta = fso.GetParentFolderName(WScript.ScriptFullName)
If fso.FileExists(carpeta & "\.subir-ahora") Or fso.FileExists(carpeta & "\.fusionar-main") Then
  CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File """ & carpeta & "\autosubida.ps1""", 0, True
End If
