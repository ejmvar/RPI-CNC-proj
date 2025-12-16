; Text Engraving - "CNC"
; Single-line font engraving
; Tool: V-bit 30 degree
; Depth: -0.5mm
; Height: 10mm per letter

G21 G90 G17
M3 S18000
G0 Z5

; Letter C
G0 X5 Y15
G1 Z-0.5 F100
G3 X5 Y5 I0 J-5 F200
G0 Z5

; Letter N
G0 X15 Y5
G1 Z-0.5 F100
G1 Y15 F200
G1 X20 Y5
G1 Y15
G0 Z5

; Letter C (second)
G0 X30 Y15
G1 Z-0.5 F100
G3 X30 Y5 I0 J-5 F200
G0 Z5

; Return
M5
G0 X0 Y0
M2
