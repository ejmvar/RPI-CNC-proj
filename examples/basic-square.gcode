; Simple Square - Basic CNC Test Pattern
; This program cuts a 50mm square at safe speeds
; Perfect for testing your machine setup and calibration

; Program Info
; Size: 50mm x 50mm
; Depth: -2mm
; Feed Rate: 300mm/min
; Spindle: 10000 RPM

G21         ; Set units to millimeters
G90         ; Absolute positioning
G17         ; XY plane selection

; Initialize
M3 S10000   ; Start spindle at 10000 RPM
G0 Z5       ; Raise to safe height
G0 X0 Y0    ; Move to origin

; Wait for spindle to reach speed
G4 P2       ; Dwell 2 seconds

; Cut the square
G0 Z2       ; Move to just above surface
G1 Z-2 F100 ; Plunge to cutting depth
G1 X50 F300 ; Cut to X50 (right side)
G1 Y50      ; Cut to Y50 (top)
G1 X0       ; Cut to X0 (left side)
G1 Y0       ; Cut to Y0 (bottom - back to start)

; Retract and finish
G0 Z5       ; Raise to safe height
M5          ; Stop spindle
G0 X0 Y0    ; Return to origin

M2          ; Program end
