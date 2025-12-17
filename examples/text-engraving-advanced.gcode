;
; Advanced Text Engraving Example
; Single-pass engraving with variable depth and speed control
; Text: "CNC SIMULATOR" (simplified letter forms)
;

G90           ; Absolute positioning
G21           ; Metric units
G17           ; XY plane selection

; Engraving tool setup
M5            ; Spindle off initially
G28           ; Home all axes
G92 X0 Y0 Z0  ; Set origin

; Spindle at 8000 RPM for engraving
M3 S8000
G04 P1000     ; Wait for spindle stabilization

G0 Z1         ; Safe height above surface

; **Letter C** - Arc engraving
; Engraving depth: 0.5mm
; Feed rate: 60mm/min for fine detail

G0 X5 Y10     ; Start position for letter C
G1 Z-0.5 F60  ; Plunge to engraving depth

; Semi-circular arc (C shape approximated with G-Code)
G1 X7 Y12 F60  ; Upper arc endpoint
G0 Z1          ; Retract

G0 X8 Y12
G1 Z-0.5 F60   ; Continue C shape
G1 X10 Y10 F60 ; Right curve
G0 Z1          ; Retract

G0 X10 Y8
G1 Z-0.5 F60   ; Lower part of C
G1 X8 Y6 F60
G0 Z1

; **Letter N** - Straight lines with angles
G0 X12 Y6      ; Position for letter N
G1 Z-0.5 F60   ; Plunge

G1 X12 Y12 F60 ; Left vertical stroke
G0 Z1

G0 X12 Y12
G1 Z-0.5 F60
G1 X16 Y6 F60  ; Diagonal stroke
G0 Z1

G0 X16 Y6
G1 Z-0.5 F60
G1 X16 Y12 F60 ; Right vertical stroke
G0 Z1

; **Letter C (second)** - Repeat C pattern offset
G0 X18 Y10
G1 Z-0.5 F60
G1 X20 Y12 F60
G0 Z1

G0 X21 Y12
G1 Z-0.5 F60
G1 X23 Y10 F60
G0 Z1

G0 X23 Y8
G1 Z-0.5 F60
G1 X21 Y6 F60
G0 Z1

; **Letter S** - Curved strokes
G0 X25 Y12    ; Top of S
G1 Z-0.5 F60
G1 X27 Y12 F60 ; Top curve right
G0 Z1

G0 X27 Y10
G1 Z-0.5 F60
G1 X25 Y9 F60  ; Middle curve left
G0 Z1

G0 X25 Y9
G1 Z-0.5 F60
G1 X27 Y8 F60  ; Lower curve right
G0 Z1

G0 X27 Y6
G1 Z-0.5 F60
G1 X25 Y6 F60  ; Bottom stroke
G0 Z1

; **Letter I** - Simple vertical line
G0 X30 Y6
G1 Z-0.5 F60
G1 X30 Y12 F60 ; Vertical stroke
G0 Z1

; **Letter M** - Multiple strokes
G0 X32 Y6
G1 Z-0.5 F60
G1 X32 Y12 F60 ; Left vertical
G0 Z1

G0 X32 Y12
G1 Z-0.5 F60
G1 X34 Y10 F60 ; Diagonal down-right
G0 Z1

G0 X34 Y10
G1 Z-0.5 F60
G1 X36 Y12 F60 ; Diagonal up-right
G0 Z1

G0 X36 Y12
G1 Z-0.5 F60
G1 X36 Y6 F60  ; Right vertical
G0 Z1

; **Decorative underline** - Horizontal line
G0 X5 Y4
G1 Z-0.5 F60
G1 X37 Y4 F60  ; Long underline stroke
G0 Z1

; Safe shutdown
M5            ; Spindle off
G0 Z2         ; Raise to safe height
G28           ; Home all axes
M30           ; Program end
