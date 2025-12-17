;
; Real-World Project: Nameplate Engraving
; Professional engraved nameplate: 100mm x 40mm
; Material: Aluminum or brass (brushed finish)
; Technique: V-bit engraving with variable depth for shading
;

G90                   ; Absolute positioning
G21                   ; Metric units
G17                   ; XY plane selection

M5                    ; Spindle off initially
G28                   ; Home all axes
G92 X0 Y0 Z0          ; Set origin at bottom-left corner

; **SETUP NOTES:**
; - V-bit 90° angle, 3.175mm shank
; - Spindle: 12000 RPM for aluminum engraving
; - Feed rate: 40-50mm/min for fine detail
; - No through-cut needed - shallow engraving (0.5-2mm depth)
;

M3 S12000             ; Spindle on at 12000 RPM for fine detail
G04 P1500             ; Wait for spindle stabilization

G0 Z2                 ; Safe height above surface

; **OUTER BORDER** - Rectangle frame for professional look
G0 X2 Y2              ; Start corner with 2mm margin
G1 Z-0.5 F40          ; Shallow engrave
G1 X98 Y2 F40         ; Top border
G1 X98 Y38 F40        ; Right border
G1 X2 Y38 F40         ; Bottom border
G1 X2 Y2 F40          ; Close rectangle
G0 Z2                 ; Retract

; **DECORATIVE CORNER ELEMENTS** - Small flourishes
G0 X5 Y5
G1 Z-0.3 F40
G1 X7 Y3 F40          ; Top-left corner accent
G0 Z2

G0 X95 Y5
G1 Z-0.3 F40
G1 X93 Y3 F40         ; Top-right corner accent
G0 Z2

G0 X5 Y35
G1 Z-0.3 F40
G1 X7 Y37 F40         ; Bottom-left corner accent
G0 Z2

G0 X95 Y35
G1 Z-0.3 F40
G1 X93 Y37 F40        ; Bottom-right corner accent
G0 Z2

; **MAIN TEXT** - "PRECISION CNC SOLUTIONS"
; Engraved with slightly deeper cut for emphasis
; Approximate character positions (simplified letter forms)

; Letter P (10mm width starting at X10)
G0 X12 Y25
G1 Z-1 F40            ; Deeper cut for main text
G1 X12 Y20 F40        ; Vertical stroke
G0 Z2

G0 X12 Y22
G1 Z-1 F40
G1 X16 Y22 F40        ; Top curve
G1 X16 Y24 F40
G1 X12 Y24 F40
G0 Z2

; Letter R (simplified)
G0 X20 Y20
G1 Z-1 F40
G1 X20 Y25 F40        ; Vertical stroke
G0 Z2

G0 X20 Y22
G1 Z-1 F40
G1 X23 Y22 F40        ; Top curve
G1 X23 Y24 F40
G1 X20 Y24 F40
G0 Z2

G0 X23 Y24
G1 Z-1 F40
G1 X25 Y25 F40        ; Diagonal leg
G0 Z2

; Letter E (simplified: three horizontal strokes)
G0 X28 Y20
G1 Z-1 F40
G1 X28 Y25 F40        ; Left vertical
G0 Z2

G0 X28 Y20
G1 Z-1 F40
G1 X32 Y20 F40        ; Top horizontal
G0 Z2

G0 X28 Y22
G1 Z-1 F40
G1 X31 Y22 F40        ; Middle horizontal
G0 Z2

G0 X28 Y25
G1 Z-1 F40
G1 X32 Y25 F40        ; Bottom horizontal
G0 Z2

; Letter C (arc)
G0 X36 Y22
G1 Z-1 F40
G1 X36 Y20 F40        ; Top arc start
G1 X38 Y20 F40        ; Curve right
G0 Z2

G0 X38 Y20
G1 Z-1 F40
G1 X38 Y25 F40        ; Right edge
G0 Z2

G0 X38 Y25
G1 Z-1 F40
G1 X36 Y25 F40        ; Bottom arc
G1 X36 Y25 F40        ; Curve end
G0 Z2

; **SECONDARY TEXT** - Smaller subtitle below
; "Quality • Precision • Innovation"
; Engraved at shallower depth (0.3mm) for delicate look

G0 X15 Y10
G1 Z-0.3 F50
G1 X20 Y10 F50        ; "Quality" simplified
G0 Z2

G0 X25 Y10
G1 Z-0.3 F50
G1 X26 Y10 F50        ; Bullet point
G0 Z2

G0 X28 Y10
G1 Z-0.3 F50
G1 X34 Y10 F50        ; "Precision" simplified
G0 Z2

G0 X36 Y10
G1 Z-0.3 F50
G1 X37 Y10 F50        ; Bullet point
G0 Z2

G0 X39 Y10
G1 Z-0.3 F50
G1 X46 Y10 F50        ; "Innovation" simplified
G0 Z2

; **BOTTOM DETAIL** - Date/Serial number area
; Very shallow engraving for optional engraving

G0 X15 Y4
G1 Z-0.2 F50
G1 X20 Y4 F50         ; Space for manual detail
G0 Z2

; **SHADOW SHADING** (optional - for 3D effect with V-bit)
; Light pass at 0.1mm depth for subtle shading behind main text

M5                    ; Stop spindle
G04 P500

M3 S12000             ; Spindle back on
G04 P500

; Shadow behind "PRECISION" text (very shallow)
G0 X10 Y26
G1 Z-0.1 F60          ; Very shallow shadow
G1 X25 Y26 F60
G0 Z2

G0 X10 Y19
G1 Z-0.1 F60
G1 X25 Y19 F60
G0 Z2

; **FINISHING** - Safe shutdown

M5                    ; Spindle off
G0 Z10                ; Raise to safe clearance
G28                   ; Home all axes
M30                   ; Program end

; **PRODUCTION NOTES:**
; - Engraving time: 6-8 minutes
; - Post-processing: Light bead blasting for matte finish (optional)
; - For color fill: Use epoxy paint in grooves, sand flush after curing
; - For high-contrast: Apply patina (liver of sulfur) after engraving
; - Mounting: Drill small holes (M4) at each corner for plate mounting
; - UV coating: Apply matte or gloss lacquer for protection
