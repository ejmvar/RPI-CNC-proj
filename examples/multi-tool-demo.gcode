; Multi-Tool Demo
; Demonstrates tool changes and offset compensation
; Tool 1: Large end mill (6mm)
; Tool 2: Small end mill (3mm)
; Tool 3: Engraving bit (0.5mm)

G21 G90 G17

; Tool 1 - Rough cut outer square
T1 M6       ; Change to tool 1
G43 H1      ; Apply tool 1 offset
M3 S12000
G0 X0 Y0 Z10
G0 Z2
G1 Z-5 F100
G1 X60 F500
G1 Y60
G1 X0
G1 Y0
G0 Z10

; Tool 2 - Cut inner square
T2 M6       ; Change to tool 2
G43 H2      ; Apply tool 2 offset
G0 X15 Y15
G0 Z2
G1 Z-5 F100
G1 X45 F400
G1 Y45
G1 X15
G1 Y15
G0 Z10

; Tool 3 - Engrave detail
T3 M6       ; Change to tool 3
G43 H3      ; Apply tool 3 offset
G0 X30 Y20
G0 Z2
G1 Z-1 F50
G1 X30 Y40 F200
G0 Z10

; Finish
G49         ; Cancel tool offset
M5
G0 X0 Y0

M2
