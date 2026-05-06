Set WshShell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
exePath = scriptDir & "\release\EdgeSidebar.exe"

Set fso = CreateObject("Scripting.FileSystemObject")
If Not fso.FileExists(exePath) Then
    MsgBox "找不到 EdgeSidebar.exe" & vbCrLf & vbCrLf & _
           "请确认文件存在于:" & vbCrLf & exePath, vbExclamation, "Edge Sidebar"
    WScript.Quit 1
End If

WshShell.Run """" & exePath & """", 0, False
Set WshShell = Nothing
