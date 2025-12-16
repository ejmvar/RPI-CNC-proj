; 3D Printing Demo
; Multi-material 3D print simulation
; Layer height: 0.2mm
; 5 layers total

G21 G90     ; Millimeters, absolute
M104 S200   ; Set hotend temp (simulated)
M140 S60    ; Set bed temp (simulated)

; Layer 1 - Tool 0 (Base material - PLA)
T0
G92 E0      ; Reset extruder
G0 X10 Y10 Z0.2
G1 X90 Y10 E5 F1200
G1 X90 Y90 E10
G1 X10 Y90 E15
G1 X10 Y10 E20

; Layer 2 - Tool 0
G0 Z0.4
G1 X90 Y10 E25
G1 X90 Y90 E30
G1 X10 Y90 E35
G1 X10 Y10 E40

; Layer 3 - Tool 1 (Support material - PVA)
T1
G92 E0
G0 Z0.6
G0 X30 Y30
G1 X70 Y30 E5 F800
G1 X70 Y70 E10
G1 X30 Y70 E15
G1 X30 Y30 E20

; Layer 4 - Back to Tool 0
T0
G92 E0
G0 Z0.8
G1 X90 Y10 E5 F1200
G1 X90 Y90 E10
G1 X10 Y90 E15
G1 X10 Y10 E20

; Layer 5 - Final layer Tool 0
G0 Z1.0
G1 X90 Y10 E25
G1 X90 Y90 E30
G1 X10 Y90 E35
G1 X10 Y10 E40

; Finish
G0 Z10
M104 S0     ; Turn off hotend
M140 S0     ; Turn off bed
G0 X0 Y0

M2
