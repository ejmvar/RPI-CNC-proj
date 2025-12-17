;
; Real-World Project: PCB Isolation Routing
; Single-sided PCB trace isolation milling (demarcate copper traces)
; PCB size: 80mm x 60mm, 1.6mm FR-4 with 35µm copper
; Technique: 0.8mm V-bit for isolation routing
;
; This demonstrates the isolation-routing workflow for single-sided PCB:
; 1. Profile cut (board outline)
; 2. Isolation routing (trace isolation)
; 3. Drill holes (component pads)
;

G90                   ; Absolute positioning
G21                   ; Metric units
G17                   ; XY plane selection

M5                    ; Spindle off initially
G28                   ; Home all axes
G92 X0 Y0 Z0          ; Set origin at PCB corner

; **SETUP:**
; - V-bit 0.8mm (90° V-bit for clean traces)
; - Spindle: 10000 RPM
; - Feed: 30mm/min for trace isolation (high precision)
; - Depth: 0.2mm (just through copper, not into substrate)
;

M3 S10000             ; Spindle on
G04 P1500             ; Wait for stabilization

G0 Z2                 ; Safe height above PCB

; **SECTION 1: ISOLATION ROUTING** (cutting around traces)
; Simplified IC footprint (28-pin DIP) with traces

; **Trace 1: Power rail** (5V line running horizontally)
; Isolation cuts on both sides: above and below the trace

; Upper isolation line (2mm above trace centerline)
G0 X5 Y25
G1 Z-0.2 F30          ; Shallow isolation depth
G1 X70 Y25 F30        ; Long horizontal cut
G0 Z2

; Lower isolation line (2mm below trace)
G0 X5 Y20
G1 Z-0.2 F30
G1 X70 Y20 F30
G0 Z2

; **Trace 2: Ground rail** (parallel power rail)

; Upper isolation (ground at Y=15)
G0 X5 Y16
G1 Z-0.2 F30
G1 X70 Y16 F30
G0 Z2

; Lower isolation
G0 X5 Y11
G1 Z-0.2 F30
G1 X70 Y11 F30
G0 Z2

; **Trace 3: Signal trace** (winding path from IC to connector)
; Simplified: three segments connected at right angles

; Segment 1: Vertical (X=12, Y from 40 to 30)
G0 X11 Y40
G1 Z-0.2 F30
G1 X11 Y30 F30
G0 Z2

G0 X13 Y40
G1 Z-0.2 F30
G1 X13 Y30 F30
G0 Z2

; Segment 2: Horizontal (Y=30, X from 12 to 35)
G0 X12 Y29
G1 Z-0.2 F30
G1 X35 Y29 F30
G0 Z2

G0 X12 Y31
G1 Z-0.2 F30
G1 X35 Y31 F30
G0 Z2

; Segment 3: Vertical to connector (X=35, Y from 30 to 10)
G0 X34 Y30
G1 Z-0.2 F30
G1 X34 Y10 F30
G0 Z2

G0 X36 Y30
G1 Z-0.2 F30
G1 X36 Y10 F30
G0 Z2

; **SECTION 2: COMPONENT FOOTPRINTS** (trace connections)

; **DIP-28 IC Footprint** (centered at 40, 45)
; Two rows of 14 pads each, 2.54mm pitch

; Row 1 (left side) - Pads 1-14
G0 X30 Y50
G1 Z-0.15 F25        ; Slightly shallower for pad definition
G1 X30 Y50.5 F25     ; Pad 1 trace connection
G0 Z2

G0 X30 Y47.5
G1 Z-0.15 F25
G1 X30 Y48 F25       ; Pad 2
G0 Z2

; Repeat pattern for remaining pads (simplified - showing concept)
; In practice, all 14 pads on left side would be routed

; **Drilling Points** (transition to next phase)
; Mark drill points with shallow cuts

; Component pad vias (under-pad drilling)
G0 X30 Y50
G1 Z-0.1 F30
G1 X30 Y50.1 F30     ; Mark drill point 1
G0 Z2

; Connection vias
G0 X40 Y35
G1 Z-0.1 F30
G1 X40 Y35.1 F30     ; Via point for trace connection
G0 Z2

; **SECTION 3: PCB OUTLINE** (profile cutting)
; Separate operation: Cut around board perimeter
; This would normally be done as final pass

G0 X2 Y2              ; Start at corner with 2mm margin
G1 Z-1.8 F20          ; Cut through PCB (1.6mm board thickness)
G1 X78 Y2 F20         ; Top edge
G1 X78 Y58 F20        ; Right edge
G1 X2 Y58 F20         ; Bottom edge
G1 X2 Y2 F20          ; Close profile
G0 Z2

; Corner rounding (optional - small radius for safety)
G0 X4 Y2
G1 Z-1.8 F20
G2 X2 Y4 I-2 J2 F20   ; Rounded corner arc
G0 Z2

G0 X76 Y2
G1 Z-1.8 F20
G2 X78 Y4 I2 J2 F20   ; Rounded corner
G0 Z2

G0 X76 Y56
G1 Z-1.8 F20
G2 X78 Y54 I2 J-2 F20 ; Rounded corner
G0 Z2

G0 X4 Y56
G1 Z-1.8 F20
G2 X2 Y54 I-2 J-2 F20 ; Rounded corner
G0 Z2

; **DRILLING SECTION** (separate pass with drill bit)
; Remove spindle, install 0.8mm drill bit

M5                    ; Spindle off
G04 P1000

; Tool change notification (if using ATC)
; M6 T2                 ; Tool change to drill

M3 S4000              ; Spindle on for drilling (lower RPM)
G04 P1000

G0 Z2                 ; Safe height

; **Drill mounting holes** (M3, 2.7mm diameter) - 4 corners
G0 X5 Y5
G1 Z-1.8 F40          ; Drill through board
G0 Z2

G0 X75 Y5
G1 Z-1.8 F40
G0 Z2

G0 X75 Y55
G1 Z-1.8 F40
G0 Z2

G0 X5 Y55
G1 Z-1.8 F40
G0 Z2

; **Drill component pads** (0.8mm for IC)
G0 X30 Y50
G1 Z-1.8 F40
G0 Z2

G0 X30 Y47.5
G1 Z-1.8 F40
G0 Z2

; Additional component pads would go here...

; **Drill via holes** (very small, 0.3mm - often skipped for hand soldering)
; Skip via drilling for this example (requires smaller bit)

; **FINISHING & CLEANUP**

M5                    ; Spindle off
G0 Z10                ; Raise to safe height
G28                   ; Home all axes
M30                   ; Program end

; **PRODUCTION WORKFLOW:**
; 1. Mill isolation routing first (this program)
; 2. Drill holes (use separate bit)
; 3. Profile cut last (separates board from stock)
; 4. Remove board, deburr edges
; 5. Clean copper with brush to remove dust
; 6. Apply solder mask or lacquer coating (optional)
; 7. Ready for hand soldering or wave solder
;
; **DESIGN TIPS:**
; - Use generous isolation distance (2-3mm) for stability
; - Keep trace width at least 0.5mm for reliability
; - Via placement critical for ground return paths
; - Consider copper weight (1oz vs 2oz) for trace current capacity
; - Minimum feature size: 0.3mm (requires fine V-bit or specialized tool)
