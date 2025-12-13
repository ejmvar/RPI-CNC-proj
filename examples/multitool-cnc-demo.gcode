; Multi-tool CNC demo - Three tools
; T1 = 6mm end mill (roughing)
; T2 = 3mm end mill (finishing)
; T3 = V-bit (engraving)

G21 G90     ; mm, absolute
G17         ; XY plane

; Load roughing tool
T1 M6
G43 H1      ; apply tool 1 length offset
S12000 M3   ; spindle on 12k RPM

; Rough cut pocket
G0 Z5
G0 X10 Y10
G1 Z-5 F300
G1 X90 Y10 F800
G1 X90 Y90
G1 X10 Y90
G1 X10 Y10
G0 Z5

; Change to finishing tool
M5          ; spindle off
T2 M6
G43 H2      ; apply tool 2 length offset
S15000 M3   ; higher speed for finish

; Finish cut (slightly deeper)
G0 X15 Y15
G1 Z-5.5 F200
G1 X85 Y15 F600
G1 X85 Y85
G1 X15 Y85
G1 X15 Y15
G0 Z5

; Change to engraving tool
M5
T3 M6
G43 H3
S18000 M3

; Engrave text path
G0 X50 Y50
G1 Z-0.5 F100
G1 X55 Y52 F300
G1 X60 Y50
G1 X55 Y48
G0 Z5

M5          ; spindle off
G49         ; cancel tool offset
G0 Z100     ; safe height
M30         ; program end
