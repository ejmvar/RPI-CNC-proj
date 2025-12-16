; Auto-Leveling Demo
; This program requires mesh-based bed leveling
; Best used with the simulator's "Probe & Generate Mesh" feature

; Program Info
; Area: 80mm x 80mm
; Depth: -3mm (will be compensated)
; Grid Pattern: 4x4 lines

G21         ; Millimeters
G90         ; Absolute positioning

M3 S10000
G0 Z10
G4 P2

; Draw a grid pattern across the bed
; Horizontal lines
G0 X10 Y10
G1 Z-3 F100
G1 X90 F400
G0 Z2
G0 Y30
G1 Z-3 F100
G1 X10 F400
G0 Z2
G0 Y50
G1 Z-3 F100
G1 X90 F400
G0 Z2
G0 Y70
G1 Z-3 F100
G1 X10 F400

; Vertical lines
G0 Z2
G0 X30 Y10
G1 Z-3 F100
G1 Y90 F400
G0 Z2
G0 X50 Y90
G1 Z-3 F100
G1 Y10 F400
G0 Z2
G0 X70 Y10
G1 Z-3 F100
G1 Y90 F400

; Finish
G0 Z10
M5
G0 X0 Y0

M2
