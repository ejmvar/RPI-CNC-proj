; Circle Test - Arc Interpolation Demo
; Demonstrates G2/G3 circular interpolation
; Creates a 30mm diameter circle

; Program Info
; Diameter: 30mm
; Center: X25, Y25
; Depth: -1.5mm
; Feed Rate: 200mm/min

G21         ; Millimeters
G90         ; Absolute positioning
G17         ; XY plane

M3 S12000   ; Start spindle
G0 Z5       ; Safe height
G0 X40 Y25  ; Move to start point (right side of circle)
G4 P2       ; Wait for spindle

; Cut the circle
G0 Z0.5     ; Just above surface
G1 Z-1.5 F80 ; Plunge
G2 X40 Y25 I-15 J0 F200 ; Cut full circle (counterclockwise)

; Second pass for clean finish
G2 X40 Y25 I-15 J0 F200

; Retract
G0 Z5
M5
G0 X0 Y0

M2
