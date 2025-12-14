; PCB Milling Multi-Tool Example
; Filename: pcb-prototype.gcode
; Description: Complete PCB milling workflow with 4 tools
; Board: 50mm × 50mm single-sided prototype
; Copper Thickness: 35μm (1oz)
; Material: FR4
; Operation Time: ~25 minutes

; ============================================
; TOOL DEFINITIONS
; ============================================
; Tool 1: 0.8mm Carbide End Mill (Trace Isolation)
;         - Diameter: 0.8mm
;         - Flutes: 2
;         - Z Offset: -52.500mm
;         - Spindle Speed: 18000 RPM
;         - Feed Rate: 300 mm/min
;
; Tool 2: 1.0mm Drill (Via Holes)
;         - Diameter: 1.0mm
;         - Z Offset: -51.850mm
;         - Spindle Speed: 12000 RPM
;         - Plunge Rate: 80 mm/min
;
; Tool 3: 3.0mm End Mill (Board Outline)
;         - Diameter: 3.0mm
;         - Flutes: 2
;         - Z Offset: -52.200mm
;         - Spindle Speed: 15000 RPM
;         - Feed Rate: 600 mm/min
;
; Tool 4: 20° V-Bit (Silkscreen Engraving)
;         - Tip Diameter: 0.3mm
;         - Z Offset: -51.100mm
;         - Spindle Speed: 20000 RPM
;         - Feed Rate: 200 mm/min

; ============================================
; HEADER - Machine Setup
; ============================================

G21                     ; Millimeters
G90                     ; Absolute positioning
G17                     ; XY plane selection
G94                     ; Feed per minute mode
G54                     ; Use coordinate system 1

; ============================================
; SAFETY - Initial Positioning
; ============================================

G28 Z0                  ; Home Z axis
G0 Z10 F1000            ; Move to safe Z height
G28 X0 Y0               ; Home X and Y axes

; Origin is at bottom-left corner of PCB
G92 X0 Y0 Z0            ; Set current position as work origin

; ============================================
; OPERATION 1: TRACE ISOLATION (Tool 1)
; ============================================

M117 Trace Isolation... ; Display message

; Select Tool 1 (0.8mm end mill)
T1 M6                   ; Tool change
G43 H1                  ; Enable tool length offset for Tool 1
S18000 M3               ; Spindle on CW at 18000 RPM
G4 P2                   ; Wait 2 seconds for spindle to stabilize

; Safe approach
G0 X5 Y5 Z5 F3000       ; Rapid to start position above work
G1 Z0.1 F300            ; Lower to 0.1mm above surface
G1 Z-0.035 F100         ; Plunge to cutting depth (0.035mm = half copper thickness)

; Trace 1: Power trace (GND plane boundary)
G1 X5 Y5 F300           ; Start position
G1 X45 Y5               ; Horizontal trace
G1 X45 Y10              ; Vertical segment
G1 X5 Y10               ; Return horizontal
G1 X5 Y5                ; Close rectangle

; Trace 2: Signal trace (meandering)
G0 Z5                   ; Lift to safe height
G0 X10 Y15              ; Rapid to next trace
G1 Z-0.035 F100         ; Plunge
G1 X40 Y15 F300         ; Horizontal
G1 X40 Y17              ; Short vertical
G1 X10 Y17              ; Return
G1 X10 Y19              ; Jog up
G1 X40 Y19              ; Continue trace
G1 X40 Y21              
G1 X10 Y21

; Trace 3: Circular pad isolation
G0 Z5
G0 X25 Y30
G1 Z-0.035 F100
G2 X25 Y30 I3 J0 F300   ; Circle with 3mm radius

; Additional pad at offset
G0 Z5
G0 X35 Y35
G1 Z-0.035 F100
G2 X35 Y35 I2 J0 F300   ; Circle with 2mm radius

; Finish Tool 1
G0 Z10 F1000            ; Retract
M5                      ; Spindle off
G49                     ; Cancel tool length offset

; ============================================
; OPERATION 2: DRILLING (Tool 2)
; ============================================

M117 Drilling Vias...   ; Display message

; Select Tool 2 (1.0mm drill)
T2 M6                   ; Tool change
G43 H2                  ; Enable tool length offset for Tool 2
S12000 M3               ; Spindle on at 12000 RPM
G4 P2                   ; Wait 2 seconds

; Drill cycle setup
G98                     ; Return to initial Z level after each hole
G81 R2 Z-1.6 F80        ; Canned drill cycle: retract=2mm, depth=1.6mm, feed=80mm/min

; Via positions (6 holes)
G0 X10 Y10              ; Position 1
G0 X20 Y10              ; Position 2
G0 X30 Y10              ; Position 3
G0 X10 Y25              ; Position 4
G0 X40 Y30              ; Position 5
G0 X35 Y40              ; Position 6

; Cancel drill cycle
G80                     ; Cancel canned cycle
G0 Z10 F1000            ; Retract
M5                      ; Spindle off
G49                     ; Cancel tool length offset

; ============================================
; OPERATION 3: BOARD OUTLINE (Tool 3)
; ============================================

M117 Cutting Outline... ; Display message

; Select Tool 3 (3.0mm end mill)
T3 M6                   ; Tool change
G43 H3                  ; Enable tool length offset for Tool 3
S15000 M3               ; Spindle on at 15000 RPM
G4 P3                   ; Wait 3 seconds

; Multiple passes for full depth cut
; PCB thickness = 1.6mm, cut 0.6mm per pass

; Pass 1: -0.6mm
G0 X-2 Y-2 Z5 F3000     ; Position outside board (account for tool radius)
G1 Z-0.6 F200           ; Plunge first pass
G1 X52 Y-2 F600         ; Cut right edge
G1 X52 Y52              ; Cut top edge
G1 X-2 Y52              ; Cut left edge
G1 X-2 Y-2              ; Close rectangle

; Pass 2: -1.2mm
G1 Z-1.2 F200           ; Plunge second pass
G1 X52 Y-2 F600         ; Repeat outline
G1 X52 Y52
G1 X-2 Y52
G1 X-2 Y-2

; Pass 3: -1.8mm (through board)
G1 Z-1.8 F200           ; Plunge final pass
G1 X52 Y-2 F600         ; Final outline cut
G1 X52 Y52
G1 X-2 Y52
G1 X-2 Y-2

; Tab breakout corners (optional - leave 4 small tabs for board stability)
; Skip for this example - full cutout

; Finish Tool 3
G0 Z10 F1000            ; Retract
M5                      ; Spindle off
G49                     ; Cancel tool length offset

; ============================================
; OPERATION 4: SILKSCREEN ENGRAVING (Tool 4)
; ============================================

M117 Engraving Text...  ; Display message

; Select Tool 4 (20° V-bit)
T4 M6                   ; Tool change
G43 H4                  ; Enable tool length offset for Tool 4
S20000 M3               ; Spindle on at 20000 RPM (high speed for clean engraving)
G4 P2                   ; Wait 2 seconds

; Shallow engraving depth
G0 X8 Y43 Z5 F3000      ; Position for text "PCB-001"
G1 Z-0.1 F100           ; Light engraving depth

; Letter 'P' (simplified vector)
G1 X8 Y43 F200          ; Start
G1 X8 Y48               ; Vertical stroke
G1 X10 Y48              ; Top horizontal
G1 X10 Y45.5            ; Right vertical
G1 X8 Y45.5             ; Middle horizontal

; Letter 'C'
G0 Z2                   ; Lift
G0 X12 Y48              ; Position
G1 Z-0.1 F100           ; Engrave
G1 X14 Y48
G1 X12 Y48
G1 X12 Y43
G1 X14 Y43

; Letter 'B'
G0 Z2
G0 X16 Y43
G1 Z-0.1 F100
G1 X16 Y48
G1 X18 Y48
G1 X18 Y45.5
G1 X16 Y45.5
G1 X18 Y45.5
G1 X18 Y43
G1 X16 Y43

; Dash '-'
G0 Z2
G0 X20 Y45.5
G1 Z-0.1 F100
G1 X22 Y45.5

; Number '0'
G0 Z2
G0 X24 Y43
G1 Z-0.1 F100
G1 X24 Y48
G1 X26 Y48
G1 X26 Y43
G1 X24 Y43

; Number '0'
G0 Z2
G0 X28 Y43
G1 Z-0.1 F100
G1 X28 Y48
G1 X30 Y48
G1 X30 Y43
G1 X28 Y43

; Number '1'
G0 Z2
G0 X33 Y43
G1 Z-0.1 F100
G1 X33 Y48

; Additional detail: corner registration marks
G0 Z2
G0 X2 Y2                ; Bottom-left corner
G1 Z-0.1 F100
G1 X4 Y2 F200           ; Horizontal mark
G0 Z2
G1 X2 Y2
G1 Z-0.1 F100
G1 X2 Y4                ; Vertical mark

G0 Z2
G0 X46 Y46              ; Top-right corner
G1 Z-0.1 F100
G1 X48 Y46
G0 Z2
G1 X48 Y46
G1 Z-0.1 F100
G1 X48 Y48

; Finish Tool 4
G0 Z10 F1000            ; Retract
M5                      ; Spindle off
G49                     ; Cancel tool length offset

; ============================================
; FINISH - Return to Home
; ============================================

M117 Job Complete       ; Display message
G0 Z30 F1000            ; Raise Z to safe height
G0 X0 Y0                ; Return to origin
M30                     ; Program end and reset

; ============================================
; JOB STATISTICS
; ============================================
; Total Operations: 4
; Tool Changes: 3
; Estimated Times:
;   Trace Isolation: ~8 minutes
;   Drilling:        ~2 minutes
;   Board Outline:   ~12 minutes
;   Engraving:       ~3 minutes
; Total Time: ~25 minutes
;
; Estimated Tool Distances:
;   Tool 1 (0.8mm mill): ~450mm
;   Tool 2 (1.0mm drill): ~10mm (6 holes)
;   Tool 3 (3.0mm mill): ~630mm (3 passes)
;   Tool 4 (V-bit):      ~180mm
; Total Distance: ~1270mm
;
; Material Removed:
;   Copper: ~0.2g
;   FR4: ~1.5g
;
; Spindle Usage:
;   High Speed (18k-20k): 11 minutes
;   Medium Speed (15k):   12 minutes
;   Low Speed (12k):      2 minutes
