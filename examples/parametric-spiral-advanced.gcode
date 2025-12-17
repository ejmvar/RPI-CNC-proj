;
; Parametric Spiral Toolpath
; Demonstrates advanced arc interpolation and parametric patterns
; Creates concentric spirals with variable pitch and depth
;

G90           ; Absolute positioning
G21           ; Metric units
G17           ; XY plane selection

M5            ; Spindle off initially
G28           ; Home all axes
G92 X0 Y0 Z0  ; Set origin

; Cutting tool setup
M3 S2000      ; Spindle at 2000 RPM
G04 P1000     ; Wait for spindle stabilization

G0 Z2         ; Safe height

; **Spiral Pattern 1: Outward expanding spiral**
; Center: (20, 20), radius 1-8mm, pitch 1mm per revolution
; Feed rate: 50mm/min

G0 X21 Y20    ; Start position (radius 1mm from center)
G1 Z-1 F50    ; Plunge to 1mm depth

; Spiral out using arcs (G2/G3)
; Each revolution increases radius by 1mm and depth by 0.25mm

; Revolution 1 (radius 1-2mm)
G2 X21 Y20 I-1 J0 F50   ; Complete circle at 1mm radius
G1 Z-1.25                ; Incrementally deepen

; Revolution 2 (radius 2-3mm, moving outward)
G0 X22 Y20
G1 Z-1.25 F50
G2 X22 Y20 I-2 J0 F50    ; Circle at 2mm radius
G1 Z-1.5

; Revolution 3 (radius 3-4mm)
G0 X23 Y20
G1 Z-1.5 F50
G2 X23 Y20 I-3 J0 F50
G1 Z-1.75

; Revolution 4 (radius 4-5mm)
G0 X24 Y20
G1 Z-1.75 F50
G2 X24 Y20 I-4 J0 F50
G1 Z-2

; Revolution 5 (radius 5-6mm)
G0 X25 Y20
G1 Z-2 F50
G2 X25 Y20 I-5 J0 F50
G1 Z-2.25

; Revolution 6 (radius 6-7mm)
G0 X26 Y20
G1 Z-2.25 F50
G2 X26 Y20 I-6 J0 F50
G1 Z-2.5

; Revolution 7 (radius 7-8mm, final)
G0 X27 Y20
G1 Z-2.5 F50
G2 X27 Y20 I-7 J0 F50

G0 Z2         ; Retract

; **Spiral Pattern 2: Inward contracting spiral**
; Center: (20, 20), radius 8-1mm, inverted Z (climbing)
; Demonstrates opposite cutting direction

G0 X28 Y20    ; Start at outer radius
G1 Z-2 F50    ; Deep plunge

; Spiral inward
; Revolution 1 (radius 8-7mm)
G3 X28 Y20 I-8 J0 F50    ; Counter-clockwise arc
G1 Z-1.75

; Revolution 2 (radius 7-6mm)
G0 X27 Y20
G1 Z-1.75 F50
G3 X27 Y20 I-7 J0 F50
G1 Z-1.5

; Revolution 3 (radius 6-5mm)
G0 X26 Y20
G1 Z-1.5 F50
G3 X26 Y20 I-6 J0 F50
G1 Z-1.25

; Revolution 4 (radius 5-4mm)
G0 X25 Y20
G1 Z-1.25 F50
G3 X25 Y20 I-5 J0 F50
G1 Z-1

; Revolution 5 (radius 4-3mm)
G0 X24 Y20
G1 Z-1 F50
G3 X24 Y20 I-4 J0 F50
G1 Z-0.75

; Revolution 6 (radius 3-2mm)
G0 X23 Y20
G1 Z-0.75 F50
G3 X23 Y20 I-3 J0 F50
G1 Z-0.5

; Revolution 7 (radius 2-1mm, final approach)
G0 X22 Y20
G1 Z-0.5 F50
G3 X22 Y20 I-2 J0 F50

G0 Z2         ; Retract to safe height

; **Spiral Pattern 3: Concentric circles (fixed pitch)**
; Creates stepped spiral with same Z depth
; Useful for surfacing or flattening

G0 X25 Y20    ; Start at radius 5mm
G1 Z-1 F50

; Circle 1 (radius 5mm)
G2 X25 Y20 I-5 J0 F50

; Move to next circle (radius 6mm) without retracting
G1 X26 Y20 F50
G2 X26 Y20 I-6 J0 F50

; Circle 3 (radius 7mm)
G1 X27 Y20 F50
G2 X27 Y20 I-7 J0 F50

; Circle 4 (radius 8mm)
G1 X28 Y20 F50
G2 X28 Y20 I-8 J0 F50

; Safe shutdown
G0 Z5         ; Retract to safe height
M5            ; Spindle off
G28           ; Home all axes
M30           ; Program end
