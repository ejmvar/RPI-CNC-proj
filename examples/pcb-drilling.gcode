; PCB Drilling Pattern
; Demonstrates precision drilling for printed circuit boards
; Tool: 0.8mm carbide drill bit
; Material: FR4 PCB blank
; Depth: -1.6mm (through board)

G21 G90 G17     ; Metric, absolute, XY plane
M3 S12000       ; Spindle on at 12000 RPM
G0 Z5           ; Safe height

; Drill pattern - 8 holes in 2x4 grid
; Spacing: 2.54mm (0.1 inch)

; Row 1
G0 X10 Y10
G1 Z-1.6 F50    ; Peck drill
G0 Z5

G0 X12.54 Y10
G1 Z-1.6 F50
G0 Z5

G0 X15.08 Y10
G1 Z-1.6 F50
G0 Z5

G0 X17.62 Y10
G1 Z-1.6 F50
G0 Z5

; Row 2
G0 X10 Y12.54
G1 Z-1.6 F50
G0 Z5

G0 X12.54 Y12.54
G1 Z-1.6 F50
G0 Z5

G0 X15.08 Y12.54
G1 Z-1.6 F50
G0 Z5

G0 X17.62 Y12.54
G1 Z-1.6 F50
G0 Z5

; Return home
M5              ; Spindle off
G0 X0 Y0
M2              ; Program end
