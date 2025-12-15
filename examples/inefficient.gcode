; Example G-Code with optimization opportunities
; This file demonstrates inefficient patterns that the optimizer can fix

; Redundant moves to same position
G0 X0 Y0 Z5
G0 X0 Y0 Z5
G1 X10 Y0 F1000
G1 X10 Y0 F1000

; Collinear segments (can be combined)
G1 X10 Y0 F1000
G1 X20 Y0 F1000
G1 X30 Y0 F1000
G1 X40 Y0 F1000

; Duplicate feed rates
G1 X40 Y10 F1000
G1 X50 Y10 F1000
G1 X60 Y10 F1000

; More collinear segments at different angle
G1 X60 Y10 F500
G1 X70 Y20 F500
G1 X80 Y30 F500
G1 X90 Y40 F500

; Redundant moves
G1 X90 Y40
G1 X90 Y40

; Final position
G1 X100 Y50 F1000
G0 Z10

; End program
M30
