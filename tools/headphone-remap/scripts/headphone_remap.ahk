; =========================================================================
; MINISO 3.5mm 耳机按键重映射（最终版 v3）
;   +     (Volume_Up)  →  ↑
;   −     (Volume_Down) →  ↓
;   中键  (vkB3)       →  Enter
;
; ⚠ AHK v2 怪癖：单独写 vkB3 不生效；必须同时定义 Media_Play_Pause::
;   （空操作也行）才能让 Realtek CTIA 中键事件走到 vkB3 路径。
; =========================================================================

#Requires AutoHotkey v2.0

LogFile := A_ScriptDir "\headphone_log.txt"
FileDelete LogFile
FileAppend "=== Started " A_Now " ===`n", LogFile

Volume_Up:: {
    Send "{Up}"
    FileAppend A_Now "  + -> Up`n", LogFile
}

Volume_Down:: {
    Send "{Down}"
    FileAppend A_Now "  - -> Down`n", LogFile
}

; 必要的占位：让 AHK 注册 vkB3 对应的输入路径
Media_Play_Pause:: {
}

; 中键主处理
vkB3:: {
    Send "{Enter}"
    FileAppend A_Now "  M -> Enter`n", LogFile
}

TrayTip "耳机按键已激活 v3", "VOL+ → ↑`nVOL− → ↓`n中键 → Enter`n日志: " LogFile, 1