; Simple 2D square demonstration
; Perfect for testing the 2D renderer
; Total path: 40mm
G21 ; mm mode
G90 ; absolute positioning

; Rapid to start position
G0 X0 Y0 Z5
G0 Z0

; Draw square (10x10mm)
G1 X10 Y0 F500
G1 X10 Y10
G1 X0 Y10
G1 X0 Y0

; Lift and rapid to center
G0 Z5
G0 X5 Y5

; Draw diagonal cross
G1 Z0 F100
G1 X0 Y0 F500
G0 X10 Y10
G1 X10 Y0
G0 X0 Y10
G1 X10 Y10

; Done
G0 Z10
M30
