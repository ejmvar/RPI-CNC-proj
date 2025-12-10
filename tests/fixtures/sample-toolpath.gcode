; Sample G-code for testing optimization
; Machine setup
G21 ; mm mode
G90 ; absolute positioning
G92 X0 Y0 Z0 ; set current position as origin

; Safe Z height move (should convert to G0)
G1 Z10 F500
G1 Z10 F500 ; Redundant - same position

; Move to start position
G0 X10 Y10
G1 Z-2 F300

; Simple square pattern with redundant moves
G1 X10 Y10 ; Already at this position - redundant
G1 X20 Y10 F500
G1 X20 Y10 ; Redundant
G1 X20 Y20
G1 X10 Y20
G1 X10 Y10

; Lift to safe height (should convert to G0 rapid)
G1 Z10 F500

; Second square with more redundancy
G0 X30 Y30
G1 Z-2 F300
G1 X40 Y30 F500
G1 X40 Y30 ; Redundant
G1 X40 Y40
G1 X40 Y40 ; Redundant
G1 X30 Y40
G1 X30 Y30

; Return to origin
G1 Z10 F500 ; Safe height - should be G0
G0 X0 Y0
G1 Z0 F300

M30 ; Program end
