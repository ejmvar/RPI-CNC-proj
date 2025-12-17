;
; Advanced PCB Drilling Pattern
; Multi-hole drilling with optimized tool path
; Target: Small PCB with 24 holes of varying sizes
;
; Feed rates optimized for hardened drill bits on copper
; Rapid height: 2mm above surface
;

G90           ; Absolute positioning
G21           ; Metric units
G17           ; XY plane selection

; Tool setup: 0.8mm drill bit
M5            ; Spindle off initially
G28           ; Home all axes
G92 X0 Y0 Z0  ; Set origin

; Spindle at 3000 RPM for PCB drilling
M3 S3000
G04 P1000     ; Wait for spindle stabilization

; **Hole Group 1: Signal pads (0.8mm)** - 12 holes
; Arranged in 3x4 grid with 10mm spacing
G0 Z2         ; Safe height

; Row 1
G0 X5 Y5
G1 Z-2 F100   ; Drill depth -2mm, feed 100mm/min
G0 Z2

G0 X15 Y5
G1 Z-2 F100
G0 Z2

G0 X25 Y5
G1 Z-2 F100
G0 Z2

G0 X35 Y5
G1 Z-2 F100
G0 Z2

; Row 2
G0 X5 Y15
G1 Z-2 F100
G0 Z2

G0 X15 Y15
G1 Z-2 F100
G0 Z2

G0 X25 Y15
G1 Z-2 F100
G0 Z2

G0 X35 Y15
G1 Z-2 F100
G0 Z2

; Row 3
G0 X5 Y25
G1 Z-2 F100
G0 Z2

G0 X15 Y25
G1 Z-2 F100
G0 Z2

G0 X25 Y25
G1 Z-2 F100
G0 Z2

G0 X35 Y25
G1 Z-2 F100
G0 Z2

; **Hole Group 2: Power pads (1.2mm)** - 4 corner holes
; Larger diameter holes at each corner

M5            ; Stop spindle
G04 P500      ; Wait for spindle stop
M3 S2500      ; Lower RPM for larger hole
G04 P1000     ; Wait for spindle stabilization

G0 Z2

G0 X2 Y2
G1 Z-2 F80    ; Slower feed for larger hole
G0 Z2

G0 X38 Y2
G1 Z-2 F80
G0 Z2

G0 X2 Y28
G1 Z-2 F80
G0 Z2

G0 X38 Y28
G1 Z-2 F80
G0 Z2

; **Via drilling** - Small vias (0.5mm) at strategic locations
M5
G04 P500
M3 S4000      ; Higher RPM for smaller holes
G04 P1000

G0 Z2

; Via positions (optimized path)
G0 X10 Y10
G1 Z-1.5 F120 ; Shallow depth for vias
G0 Z2

G0 X20 Y10
G1 Z-1.5 F120
G0 Z2

G0 X30 Y10
G1 Z-1.5 F120
G0 Z2

G0 X10 Y20
G1 Z-1.5 F120
G0 Z2

G0 X20 Y20
G1 Z-1.5 F120
G0 Z2

G0 X30 Y20
G1 Z-1.5 F120
G0 Z2

; Safe shutdown
M5            ; Spindle off
G0 Z5         ; Raise to safe height
G28           ; Home all axes
M30           ; Program end
