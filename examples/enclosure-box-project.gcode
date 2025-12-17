;
; Real-World Project: Simple Enclosure Box
; 3-piece enclosure (top, bottom, side panel) for small electronics
; Material: 3mm acrylic or plywood
; Total stock: 200mm x 100mm x 3mm
;
; Box dimensions: 60mm x 40mm x 35mm height
; Design: Box with mounting holes and finger joints
;

G90                   ; Absolute positioning
G21                   ; Metric units
G17                   ; XY plane selection

M5                    ; Spindle off initially
G28                   ; Home all axes
G92 X0 Y0 Z0          ; Set origin at stock corner

; Material: 3mm acrylic - use single pass at shallow depth
; Spindle: 5000 RPM for acrylic
; Feed: 80mm/min for cutting, 150mm/min for rapids

M3 S5000              ; Spindle on at 5000 RPM
G04 P1000             ; Wait for spindle stabilization

G0 Z3                 ; Safe height (just above material)

; **PART 1: BOTTOM PANEL** (60mm x 40mm with mounting holes)
; Position: origin (0,0)

; Outer profile (perimeter cut)
G0 X0 Y0              ; Start corner
G1 Z-3.2 F80          ; Plunge to cut through 3mm
G1 X60 Y0 F80         ; Top edge
G1 X60 Y40 F80        ; Right edge
G1 X0 Y40 F80         ; Bottom edge
G1 X0 Y0 F80          ; Close profile
G0 Z3                 ; Retract

; Mounting holes (M3 size, 2.7mm diameter) - 4 corners
G0 X5 Y5              ; Hole 1
G1 Z-3.2 F60          ; Drill
G0 Z3

G0 X55 Y5             ; Hole 2
G1 Z-3.2 F60
G0 Z3

G0 X55 Y35            ; Hole 3
G1 Z-3.2 F60
G0 Z3

G0 X5 Y35             ; Hole 4
G1 Z-3.2 F60
G0 Z3

; Cable pass-through hole (10mm x 5mm rectangular notch - approximated)
G0 X30 Y38
G1 Z-3.2 F60
G1 X40 Y38 F60
G0 Z3

G0 X40 Y38
G1 Z-3.2 F60
G1 X40 Y40 F60
G0 Z3

; **PART 2: TOP PANEL** (60mm x 40mm with ventilation slots)
; Position: offset 70mm on X axis

G0 X70 Y0             ; Start position for top panel
G1 Z-3.2 F80
G1 X130 Y0 F80        ; Outer edge
G1 X130 Y40 F80
G1 X70 Y40 F80
G1 X70 Y0 F80
G0 Z3

; Ventilation slots (3 horizontal slots, 40mm long, 3mm wide)
; Slot 1
G0 X75 Y12
G1 Z-3.2 F80
G1 X125 Y12 F80       ; Cut 50mm slot
G0 Z3

G0 X125 Y15           ; Retract and move to parallel line
G1 Z-3.2 F80
G1 X75 Y15 F80        ; Return cut
G0 Z3

; Slot 2 (offset)
G0 X75 Y22
G1 Z-3.2 F80
G1 X125 Y22 F80
G0 Z3

G0 X125 Y25
G1 Z-3.2 F80
G1 X75 Y25 F80
G0 Z3

; Slot 3
G0 X75 Y32
G1 Z-3.2 F80
G1 X125 Y32 F80
G0 Z3

G0 X125 Y35
G1 Z-3.2 F80
G1 X75 Y35 F80
G0 Z3

; Mounting holes (M3) - aligned with bottom panel
G0 X75 Y5             ; Hole 1
G1 Z-3.2 F60
G0 Z3

G0 X125 Y5            ; Hole 2
G1 Z-3.2 F60
G0 Z3

G0 X125 Y35           ; Hole 3
G1 Z-3.2 F60
G0 Z3

G0 X75 Y35            ; Hole 4
G1 Z-3.2 F60
G0 Z3

; **PART 3: SIDE PANEL** (35mm x 40mm with finger joints for assembly)
; Position: offset 140mm on X axis
; Finger joints: alternating 5mm fingers for interlocking assembly

G0 X140 Y0            ; Start
G1 Z-3.2 F80
G1 X175 Y0 F80        ; Cut top edge
G0 Z3

; Create finger joint pattern (5mm on, 5mm off pattern)
; Bottom edge with fingers
G0 X140 Y40           ; Start bottom
G1 Z-3.2 F80

G1 X145 Y40 F80       ; Finger 1 on
G1 X145 Y35 F80       ; Vertical cut
G1 X150 Y35 F80       ; Step over
G1 X150 Y40 F80       ; Vertical cut back
G1 X155 Y40 F80       ; Finger 2 on
G1 X155 Y35 F80
G1 X160 Y35 F80
G1 X160 Y40 F80
G1 X165 Y40 F80       ; Finger 3 on
G1 X165 Y35 F80
G1 X170 Y35 F80
G1 X170 Y40 F80
G1 X175 Y40 F80       ; End edge
G0 Z3

; Right vertical edge
G0 X175 Y40
G1 Z-3.2 F80
G1 X175 Y0 F80
G0 Z3

; Left vertical edge
G0 X140 Y0
G1 Z-3.2 F80
G1 X140 Y40 F80
G0 Z3

; **FINISHING PASS** - smooth any rough edges with slower speed

M5                    ; Spindle off
G04 P500

M3 S4000              ; Reduced spindle speed for smooth finish
G04 P1000

; Light pass on perimeters (optional final smoothing)
; Skip for now - go to safe position

G0 Z10                ; Raise to safe height
M5                    ; Spindle off
G28                   ; Home all axes
M30                   ; Program end

; Production notes:
; - Total cut time: approximately 8-12 minutes
; - Requires double-sided tape to hold acrylic during cutting
; - Use finishing pass if edge quality is critical
; - Deburr edges by hand with light sanding (120-220 grit)
; - Assembly: Stack panels and insert M3x20 bolts through mounting holes
; - Optional: Apply acrylic cement to finger joints before final assembly
