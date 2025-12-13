; Multi-tool 3D print demo - Two colors
; T0 = PLA Red (base layer)
; T1 = PETG Blue (accent layer)

G21         ; millimeters
G90         ; absolute positioning
M82         ; absolute extrusion
M104 S200 T0 ; preheat extruder 0
M140 S60    ; preheat bed

T0          ; select extruder 0 (red)
G1 Z0.2 F5000
G1 X0 Y0 E0

; Print base layer (red)
G1 X50 Y0 E5 F1200
G1 X50 Y50 E10
G1 X0 Y50 E15
G1 X0 Y0 E20

; Tool change to blue
T1 M6
M109 S230 T1 ; wait for blue extruder temp
G1 X10 Y10 ; move to accent position

; Print accent layer (blue)
G1 X40 Y10 E25
G1 X40 Y40 E30
G1 X10 Y40 E35
G1 X10 Y10 E40

; Return to red for finishing
T0 M6
M109 S200 T0
G1 X5 Y5
G1 X45 Y5 E45
G1 X45 Y45 E50

M104 S0 T0  ; cool down extruders
M104 S0 T1
M140 S0     ; cool bed
G1 Z100     ; raise Z
M84         ; disable motors
