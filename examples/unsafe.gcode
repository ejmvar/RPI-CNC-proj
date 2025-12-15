; Example G-Code with SAFETY VIOLATIONS
; This file demonstrates unsafe patterns that the collision detector will catch

; Out of bounds X axis (machine limit: 200mm)
G0 X250 Y50 Z10

; Out of bounds Y axis (machine limit: 200mm)
G0 X50 Y250 Z10

; Out of bounds Z axis (too high, limit: 50mm)
G0 X50 Y50 Z100

; Rapid plunge (unsafe Z drop > 10mm)
G0 Z10
G0 Z-30

; Excessive feed rate (limit: 3000 mm/min)
G1 X100 Y100 F5000

; Excessive spindle speed (limit: 24000 RPM)
M3 S30000

; Missing feed rate on cutting move
G1 X50 Y50

; Final position
G0 Z10
M30
