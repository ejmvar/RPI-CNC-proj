; Example G-Code - SAFE for machining
; This file demonstrates proper G-Code with no safety violations

; Safe rapid positioning
G0 X50 Y50 Z10

; Safe Z approach above workpiece
G0 Z5

; Start spindle at safe speed
M3 S12000

; Safe slow plunge into material (below workpiece surface at Z=0)
G1 Z-1 F500

; Safe cutting moves with proper feed rate
G1 X100 Y50 F1000
G1 X100 Y100
G1 X50 Y100
G1 X50 Y50

; Safe Z retract to clearance height
G1 Z5 F500

; Rapid to safe height
G0 Z10

; Stop spindle
M5

; Return to home
G0 X0 Y0

; End program
M30
