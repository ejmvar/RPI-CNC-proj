# Hardware Integration Module

## Phase 15.4: Hardware Integration

Provides real hardware connectivity and control for CNC machines.

## Modules

### WebSerialAPI

Browser-based WebSerial communication for direct GRBL connection:

- **Port Management**

  - Enumerate available serial ports
  - Request user port selection
  - Port information (vendor, product)

- **Connection Management**

  - Connect/disconnect from CNC
  - Configurable baud rate (default 115200)
  - Automatic reconnection with exponential backoff

- **Data Communication**

  - Send G-Code commands
  - Receive status reports from GRBL
  - Parse machine and work coordinates

- **Real-Time Feedback**
  - Status report parsing (`<Idle|MPos:...>`)
  - Command acknowledgment (ok/error)
  - Real-time position updates

**Features:**

- WebSerial API detection
- Automatic port detection
- GRBL status report parsing
- Event-driven architecture
- Reconnection handling
- Configurable timeouts

### PositionFeedback

Real-time position tracking and visualization:

- **Position Management**

  - Machine coordinates vs work coordinates
  - Tool offset tracking
  - Position delta calculation

- **History Tracking**

  - Record position history with timestamps
  - Configurable history size (default 1000)
  - Movement delta and distance tracking

- **Statistics**

  - Total distance traveled
  - Min/max positions
  - Bounding box calculation
  - Movement analysis

- **Coordinate Systems**
  - Work coordinate system (WCS)
  - Machine coordinate system (MCS)
  - Tool offset management

**Features:**

- Real-time position updates
- Position history with configurable size
- Movement statistics and analytics
- Offset management
- Event notifications

### JogControls

Manual machine movement and control interface:

- **Jog Operations**

  - Single-step jog (incremental movement)
  - Continuous jog (stream movement)
  - Rapid jog (high-speed movement)
  - Configurable increments (0.1, 0.5, 1.0, 5.0, 10.0mm)

- **Feed Rate Control**

  - Normal feed rate (default 100 mm/min)
  - Rapid feed rate (default 500 mm/min)
  - Dynamic feed rate changes

- **Input Handling**

  - Keyboard controls (Arrow keys, W/S for Z)
  - Gamepad support (optional)
  - Multi-axis simultaneous control

- **Safety**
  - Feed rate limits
  - Travel direction control
  - Jog status tracking

**Features:**

- Incremental and continuous jog modes
- Configurable feed rates and increments
- Keyboard event handling
- Real-time jog status
- Event-driven control

### MachineProfiles

Machine-specific configuration and presets:

- **Profile Management**

  - Create, update, delete machine profiles
  - Default profile included
  - Profile import/export (JSON)
  - Multiple profiles support (up to 50)

- **Machine Specifications**

  - Work area dimensions (X, Y, Z)
  - Rapid feed rate limits
  - Cutting feed rate limits
  - Spindle specifications (type, RPM range)

- **Tool Management**

  - Store tool offsets per profile
  - Tool diameter and length
  - Tool offset in X, Y, Z
  - Add/remove tools dynamically

- **Safety Limits**

  - Maximum cutting feed
  - Maximum rapid feed
  - Warning distance
  - Emergency stop capability

- **Bounds Validation**
  - Check if position is within work area
  - Detect out-of-bounds violations
  - Work area bounds reporting

**Features:**

- Profile CRUD operations
- Tool offset management
- Bounds validation
- Import/export to JSON
- Active profile switching
- Statistics and reporting

## Usage Example

```javascript
import { WebSerialAPI } from 'modules/hardware/webserial-api.mjs';
import { PositionFeedback } from 'modules/hardware/position-feedback.mjs';
import { JogControls } from 'modules/hardware/jog-controls.mjs';
import { MachineProfiles } from 'modules/hardware/machine-profiles.mjs';

// Check WebSerial support
if (!WebSerialAPI.isSupported()) {
  console.log('WebSerial not available');
}

// Request and connect to port
const api = new WebSerialAPI({ baudRate: 115200 });
const portInfo = await api.requestPort();
await api.connect(portInfo.port);

// Setup position feedback
const feedback = new PositionFeedback({ historySize: 1000 });
api.on('status', (status) => feedback.updatePosition(status));

// Setup jog controls
const jog = new JogControls();
jog.on('jog:initiated', (cmd) => api.send(cmd.command));

// Load machine profile
const profiles = new MachineProfiles();
const profile = profiles.getProfile('default');
profiles.setActiveProfile('default');
```

## Test Coverage

- **WebSerialAPI:** 9 tests
- **PositionFeedback:** 12 tests
- **JogControls:** 11 tests
- **MachineProfiles:** 18 tests

**Total:** 50 tests in `tests/ut/hardware/hardware.test.mjs`

## Architecture

All modules follow consistent patterns:

- **Event System:** on/off/emit for reactive updates
- **Status Tracking:** getStatus() for connection/control state
- **Error Handling:** Validation and error messages
- **Configuration:** Constructor options for customization
- **Persistence:** Export/import capabilities where applicable

## Integration Points

- WebSerial API for low-level port communication
- GRBL status report parsing
- Real-time position feedback
- Manual jog control
- Machine profile management
- Tool and offset management
- Bounds checking and safety validation

## Browser Compatibility

- Requires Chrome/Edge 89+ for WebSerial API
- Graceful fallback for unsupported browsers
- No Electron/Node.js dependencies (browser-only)
