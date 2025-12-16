; Complex Pocket - Advanced Milling
; Demonstrates ramping, multiple depth passes, and finishing
; Creates a 40x30mm pocket with 8mm depth

G21 G90 G17

M3 S14000
G0 Z10

; Rough passes - 2mm per pass
G0 X20 Y15  ; Center of pocket

; Pass 1: Z-2mm
G1 Z0 F100
G1 Z-2 F80
G1 X15 F600  ; Spiral out
G1 Y10
G1 X45
G1 Y35
G1 X5
G1 Y5
G1 X55
G1 Y40
G0 Z0

; Pass 2: Z-4mm
G1 Z-4 F80
G1 X15 F600
G1 Y10
G1 X45
G1 Y35
G1 X5
G1 Y5
G1 X55
G1 Y40
G0 Z0

; Pass 3: Z-6mm
G1 Z-6 F80
G1 X15 F600
G1 Y10
G1 X45
G1 Y35
G1 X5
G1 Y5
G1 X55
G1 Y40
G0 Z0

; Pass 4: Z-8mm (final depth)
G1 Z-8 F80
G1 X15 F600
G1 Y10
G1 X45
G1 Y35
G1 X5
G1 Y5
G1 X55
G1 Y40

; Finishing pass - slow feed for quality
G1 X10 Y10 F300
G1 X50
G1 Y35
G1 X10
G1 Y10

; Retract
G0 Z10
M5
G0 X0 Y0

M2
