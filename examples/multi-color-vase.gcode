; Complex Multi-Color 3D Print Example
; Filename: multi-color-vase.gcode
; Description: Five-color spiral vase demonstrating multi-material capabilities
; Tools Required: 5 extruders (0.4mm nozzles)
; Materials: PLA Red, Blue, Green, Yellow, Orange
; Print Time: ~45 minutes
; Layer Height: 0.2mm
; First Layer Height: 0.3mm

; ============================================
; HEADER - Printer Setup
; ============================================

G21                     ; Set units to millimeters
G90                     ; Absolute positioning
M82                     ; Absolute extrusion mode
G28                     ; Home all axes
G92 E0                  ; Reset extruder position

; ============================================
; TOOL DEFINITIONS (for simulator)
; ============================================
; Tool 0: PLA Red      - Base color (#ff0000)
; Tool 1: PETG Blue    - Layer 2-5 (#0000ff)
; Tool 2: PLA Green    - Layer 6-10 (#00ff00)
; Tool 3: PETG Yellow  - Layer 11-15 (#ffff00)
; Tool 4: PLA Orange   - Layer 16-20 (#ff8800)

; ============================================
; BED & EXTRUDER HEATING
; ============================================

M140 S60                ; Set bed temp to 60°C (don't wait)
T0                      ; Select Tool 0 (PLA Red)
M104 T0 S210            ; Set Tool 0 temp to 210°C
M109 T0 S210            ; Wait for Tool 0 to reach temp
M190 S60                ; Wait for bed to reach 60°C

; ============================================
; PRIME NOZZLE
; ============================================

G1 Z5 F3000             ; Lift 5mm
G1 X5 Y5 F3000          ; Move to front-left corner
G1 Z0.3 F300            ; Lower to first layer height
G92 E0                  ; Reset extruder
G1 X80 Y5 E15 F1200     ; Prime line
G1 X80 Y5.5 E18 F1200   ; Second prime line
G92 E0                  ; Reset extruder
G1 Z2 F3000             ; Lift 2mm

; ============================================
; LAYER 1 - Base (Tool 0: PLA Red)
; ============================================

; Circle base - radius 25mm, center (50, 50)
G1 X75 Y50 Z0.3 F3000   ; Move to start position
G92 E0                  ; Reset extruder
G1 F1200                ; Set print speed to 1200 mm/min
G1 X75 Y50 E0.5         ; Start extrusion

; Draw base circle with G2/G3 arcs
G2 X75 Y50 I-25 J0 E5.0 ; Full circle clockwise

; Infill pattern (simple grid)
G1 X30 Y30 E6.0
G1 X70 Y30 E8.5
G1 X70 Y70 E11.0
G1 X30 Y70 E13.5
G1 X30 Y30 E16.0

; ============================================
; LAYER 2-5 - Blue Section (Tool 1: PETG Blue)
; ============================================

; Tool change to blue
G1 Z5 F3000             ; Lift for tool change
T1 M6                   ; Select and change to Tool 1
M104 T1 S240            ; Set Tool 1 temp to 240°C (PETG)
M109 T1 S240            ; Wait for temp

; Purge tower (10mm cube at X90 Y10)
G1 X90 Y10 Z0.5 F3000
G92 E0
G1 X100 Y10 E2 F600     ; Purge with blue
G1 X100 Y20 E4
G1 X90 Y20 E6
G1 X90 Y10 E8
G1 Z5 F3000             ; Lift after purge

; Layer 2
G1 X75 Y50 Z0.5 F3000
G92 E0
G2 X75 Y50 I-25 J0 E5.0 ; Circle layer 2
G1 X32 Y32 E6.0
G1 X68 Y32 E8.5
G1 X68 Y68 E11.0
G1 X32 Y68 E13.5

; Layer 3
G1 X75 Y50 Z0.7 F3000
G92 E0
G2 X75 Y50 I-25 J0 E5.0

; Layer 4
G1 X75 Y50 Z0.9 F3000
G92 E0
G2 X75 Y50 I-25 J0 E5.0

; Layer 5
G1 X75 Y50 Z1.1 F3000
G92 E0
G2 X75 Y50 I-25 J0 E5.0

; ============================================
; LAYER 6-10 - Green Section (Tool 2: PLA Green)
; ============================================

; Tool change to green
G1 Z5 F3000
T2 M6
M104 T2 S210            ; PLA green at 210°C
M109 T2 S210

; Purge tower
G1 X90 Y10 Z1.3 F3000
G92 E0
G1 X100 Y10 E2 F600
G1 X100 Y20 E4
G1 X90 Y20 E6
G1 X90 Y10 E8
G1 Z5 F3000

; Layers 6-10 (vase starts tapering)
G1 X75 Y50 Z1.3 F3000
G92 E0
G2 X75 Y50 I-25 J0 E5.0 ; Layer 6

G1 X74 Y50 Z1.5 F3000   ; Taper inward slightly
G92 E0
G2 X74 Y50 I-24 J0 E4.9 ; Layer 7

G1 X73 Y50 Z1.7 F3000
G92 E0
G2 X73 Y50 I-23 J0 E4.8 ; Layer 8

G1 X72 Y50 Z1.9 F3000
G92 E0
G2 X72 Y50 I-22 J0 E4.7 ; Layer 9

G1 X71 Y50 Z2.1 F3000
G92 E0
G2 X71 Y50 I-21 J0 E4.6 ; Layer 10

; ============================================
; LAYER 11-15 - Yellow Section (Tool 3: PETG Yellow)
; ============================================

; Tool change to yellow
G1 Z5 F3000
T3 M6
M104 T3 S240            ; PETG yellow at 240°C
M109 T3 S240

; Purge tower
G1 X90 Y10 Z2.3 F3000
G92 E0
G1 X100 Y10 E2 F600
G1 X100 Y20 E4
G1 X90 Y20 E6
G1 X90 Y10 E8
G1 Z5 F3000

; Layers 11-15 (continue taper)
G1 X70 Y50 Z2.3 F3000
G92 E0
G2 X70 Y50 I-20 J0 E4.5 ; Layer 11

G1 X69 Y50 Z2.5 F3000
G92 E0
G2 X69 Y50 I-19 J0 E4.4 ; Layer 12

G1 X68 Y50 Z2.7 F3000
G92 E0
G2 X68 Y50 I-18 J0 E4.3 ; Layer 13

G1 X67 Y50 Z2.9 F3000
G92 E0
G2 X67 Y50 I-17 J0 E4.2 ; Layer 14

G1 X66 Y50 Z3.1 F3000
G92 E0
G2 X66 Y50 I-16 J0 E4.1 ; Layer 15

; ============================================
; LAYER 16-20 - Orange Section (Tool 4: PLA Orange)
; ============================================

; Tool change to orange
G1 Z5 F3000
T4 M6
M104 T4 S210            ; PLA orange at 210°C
M109 T4 S210

; Purge tower
G1 X90 Y10 Z3.3 F3000
G92 E0
G1 X100 Y10 E2 F600
G1 X100 Y20 E4
G1 X90 Y20 E6
G1 X90 Y10 E8
G1 Z5 F3000

; Layers 16-20 (final taper to narrow top)
G1 X65 Y50 Z3.3 F3000
G92 E0
G2 X65 Y50 I-15 J0 E4.0 ; Layer 16

G1 X64 Y50 Z3.5 F3000
G92 E0
G2 X64 Y50 I-14 J0 E3.9 ; Layer 17

G1 X63 Y50 Z3.7 F3000
G92 E0
G2 X63 Y50 I-13 J0 E3.8 ; Layer 18

G1 X62 Y50 Z3.9 F3000
G92 E0
G2 X62 Y50 I-12 J0 E3.7 ; Layer 19

G1 X61 Y50 Z4.1 F3000
G92 E0
G2 X61 Y50 I-11 J0 E3.6 ; Layer 20 (top)

; ============================================
; FINISH
; ============================================

G1 Z10 F3000            ; Lift 10mm
G1 X5 Y5 F3000          ; Move to corner
M104 S0                 ; Turn off all hotends
M140 S0                 ; Turn off bed
M84                     ; Disable motors

; ============================================
; PRINT STATISTICS
; ============================================
; Total Layers: 20
; Total Tool Changes: 4
; Estimated Filament Usage:
;   Tool 0 (Red):    ~15mm (base)
;   Tool 1 (Blue):   ~20mm (layers 2-5)
;   Tool 2 (Green):  ~23mm (layers 6-10)
;   Tool 3 (Yellow): ~21mm (layers 11-15)
;   Tool 4 (Orange): ~19mm (layers 16-20)
; Total Distance: ~98mm
; Purge Waste: ~32mm (4 purges × 8mm)
; Total Material: ~130mm

M117 Print Complete!    ; Display message
