# Firmware Integration Guide

This document describes different approaches to integrate the RPI-CNC-proj simulator with real or simulated CNC firmware.

## Integration Options

### 1. Mock GRBL (Built-in) ✅ Recommended for Testing

**Location**: `modules/backend/firmware/mock-grbl.js`

**Features**:

- Full GRBL v1.1 command simulation
- State machine (Idle/Run/Hold/Alarm/Check/Home)
- Position tracking (X, Y, Z)
- Status reports (`?`)
- Settings query (`$$`)
- Homing cycle (`$H`)
- Feed hold/resume (`!`, `~`)
- Spindle control (M3/M5)

**Usage**:

```javascript
const { MockGRBL } = require('./modules/backend/firmware/mock-grbl.js');

const grbl = new MockGRBL();

grbl.on('data', (response) => {
  console.log('GRBL:', response);
});

grbl.on('stateChange', (state) => {
  console.log('State:', state);
});

grbl.send('?'); // Query status
grbl.send('$H'); // Home
grbl.send('G0 X10 Y10'); // Move
```

**Testing**:

```bash
make test-grbl    # Run tests
make run-grbl     # Interactive demo
```

**Best for**: Unit testing, development, CI/CD, offline simulation

---

### 2. Serial Port Integration (GRBL/Marlin)

**For**: Physical CNC machines with USB/Serial connection

**Requirements**:

```bash
npm install serialport
```

**Implementation**:

```javascript
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

// GRBL typical settings
const port = new SerialPort('/dev/ttyUSB0', {
  baudRate: 115200, // GRBL default
  autoOpen: true,
});

const parser = port.pipe(new Readline({ delimiter: '\n' }));

parser.on('data', (line) => {
  console.log('GRBL:', line);
  // Handle: ok, error, <Idle|MPos:0.000,0.000,0.000|FS:0,0>
});

// Send G-code
function sendCommand(cmd) {
  port.write(cmd + '\n');
}

sendCommand('?'); // Status query
sendCommand('G0 X10 Y10');
```

**Marlin Settings**:

```javascript
const port = new SerialPort('/dev/ttyACM0', {
  baudRate: 250000, // Marlin typical
});
```

**Common Serial Ports**:

- Linux: `/dev/ttyUSB0`, `/dev/ttyACM0`
- Mac: `/dev/cu.usbserial-*`, `/dev/cu.usbmodem-*`
- Windows: `COM3`, `COM4`, etc.

**Auto-detection**:

```javascript
const SerialPort = require('serialport');

SerialPort.list().then((ports) => {
  ports.forEach((port) => {
    console.log(port.path, port.manufacturer);
  });
});
```

**Best for**: Production use with physical machines, direct hardware control

---

### 3. WebSocket Bridge (Remote CNC)

**For**: Remote CNC machines, network-based control

**Location**: `modules/backend/gateway/ws-bridge.js`

**Requirements**:

```bash
npm install ws
```

**Server (Bridge)**:

```javascript
const http = require('http');
const { createWsBridge } = require('./modules/backend/gateway/ws-bridge.js');

const server = http.createServer();
const wsBridge = createWsBridge({ server, path: '/gateway' });

// Connect to serial port
const SerialPort = require('serialport');
const port = new SerialPort('/dev/ttyUSB0', { baudRate: 115200 });

// Pipe serial data to WebSocket clients
port.on('data', (data) => {
  wsBridge.broadcast({ type: 'firmware', data: data.toString() });
});

// Pipe WebSocket commands to serial
wsBridge.on('command', (cmd) => {
  port.write(cmd + '\n');
});

server.listen(3000);
```

**Client (Simulator)**:

```javascript
const ws = new WebSocket('ws://raspberry-pi.local:3000/gateway');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'firmware') {
    console.log('Firmware response:', msg.data);
  }
};

// Send G-code
ws.send(JSON.stringify({ type: 'command', data: 'G0 X10 Y10' }));
```

**Best for**: Remote monitoring, multi-client access, web-based control

---

### 4. HTTP REST API (Custom Controller)

**For**: Firmware-agnostic integration, custom controllers

**Location**: `modules/backend/server/http-server.js`

**Server**:

```javascript
const { createHttpServer } = require('./modules/backend/server/http-server.js');

const server = createHttpServer({
  port: 8080,
  staticDir: './Simulator/web',
});

// Custom endpoints
server.app.post('/api/gcode', (req, res) => {
  const { commands } = req.body;

  // Process G-code
  commands.forEach((cmd) => {
    // Send to firmware (serial, GPIO, etc.)
    sendToFirmware(cmd);
  });

  res.json({ status: 'ok', queued: commands.length });
});

server.app.get('/api/status', (req, res) => {
  // Query firmware status
  res.json({
    state: 'Idle',
    position: { x: 0, y: 0, z: 0 },
    buffer: 0,
  });
});
```

**Client**:

```javascript
// Send G-code
fetch('/api/gcode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ commands: ['G0 X10', 'G1 Y20 F500'] }),
});

// Poll status
setInterval(async () => {
  const res = await fetch('/api/status');
  const status = await res.json();
  updateUI(status);
}, 1000);
```

**Best for**: Custom hardware, stateless control, RESTful architecture

---

### 5. GPIO Direct Control (Raspberry Pi)

**For**: No external controller, direct motor control

**Requirements**:

```bash
npm install pigpio
```

**Implementation**:

```javascript
const Gpio = require('pigpio').Gpio;

// Define stepper motor pins
const stepX = new Gpio(17, { mode: Gpio.OUTPUT });
const dirX = new Gpio(27, { mode: Gpio.OUTPUT });
const stepY = new Gpio(22, { mode: Gpio.OUTPUT });
const dirY = new Gpio(23, { mode: Gpio.OUTPUT });

// Steps per mm (depends on mechanics)
const STEPS_PER_MM = 80;

function moveX(mm, speed = 1000) {
  const steps = Math.abs(mm * STEPS_PER_MM);
  dirX.digitalWrite(mm > 0 ? 1 : 0);

  const delayUs = 1000000 / (speed * STEPS_PER_MM);

  for (let i = 0; i < steps; i++) {
    stepX.trigger(delayUs, 1);
  }
}

// Parse and execute G-code
function executeGCode(line) {
  const xMatch = line.match(/X([-\d.]+)/);
  const yMatch = line.match(/Y([-\d.]+)/);

  if (xMatch) moveX(parseFloat(xMatch[1]));
  if (yMatch) moveY(parseFloat(yMatch[1]));
}
```

**Acceleration Control**:

```javascript
function moveWithAccel(axis, mm, maxSpeed, accelRate) {
  const steps = Math.abs(mm * STEPS_PER_MM);
  const dir = mm > 0 ? 1 : 0;
  axis.dir.digitalWrite(dir);

  let speed = 0;
  for (let i = 0; i < steps; i++) {
    speed = Math.min(speed + accelRate, maxSpeed);
    const delayUs = 1000000 / (speed * STEPS_PER_MM);
    axis.step.trigger(delayUs, 1);
  }
}
```

**Best for**: Custom machines, educational projects, cost-sensitive builds

---

## Choosing the Right Integration

| Use Case             | Recommended Approach         |
| -------------------- | ---------------------------- |
| Development/Testing  | Mock GRBL (#1)               |
| USB-connected CNC    | Serial Port (#2)             |
| Remote/networked CNC | WebSocket Bridge (#3)        |
| Custom controller    | HTTP REST API (#4)           |
| DIY/Educational      | GPIO Direct (#5)             |
| Production (local)   | Serial Port (#2)             |
| Production (remote)  | WebSocket (#3) + Serial (#2) |

## Performance Comparison

| Method    | Latency  | Throughput        | Complexity |
| --------- | -------- | ----------------- | ---------- |
| Mock GRBL | <1ms     | N/A               | Low        |
| Serial    | 5-20ms   | ~115200 baud      | Low        |
| WebSocket | 10-50ms  | Network dependent | Medium     |
| HTTP REST | 20-100ms | Network dependent | Low        |
| GPIO      | <1ms     | Hardware limited  | High       |

## Security Considerations

### Serial Port

- Physical access required
- No network exposure
- ✓ Inherently secure

### WebSocket/HTTP

- ⚠️ Implement authentication
- ⚠️ Use TLS/SSL for production
- ⚠️ Validate all G-code inputs
- ⚠️ Rate limiting recommended

**Example WebSocket Auth**:

```javascript
wss.on('connection', (ws, req) => {
  const token = req.headers['authorization'];
  if (!validateToken(token)) {
    ws.close(4001, 'Unauthorized');
    return;
  }
  // ... handle connection
});
```

### GPIO

- ⚠️ Run with proper permissions
- ⚠️ Implement E-stop (emergency stop)
- ⚠️ Limit travel to safe bounds

## Testing Firmware Integration

See `tests/ut/backend/mock-grbl.test.js` for comprehensive firmware testing examples.

```bash
# Test mock firmware
make test-grbl

# Run interactive demo
make run-grbl

# Test serial integration (with hardware)
npm test -- tests/integration/serial-grbl.test.js

# Test WebSocket bridge
npm test -- tests/ut/backend/ws-bridge.test.js
```

## Troubleshooting

### Serial Port Issues

```bash
# Linux: Check permissions
sudo usermod -a -G dialout $USER
# Logout and login

# List ports
ls -la /dev/tty*

# Test connection
screen /dev/ttyUSB0 115200
```

### WebSocket Connection Failures

- Check firewall rules
- Verify server is listening (`netstat -tlnp | grep 3000`)
- Test with `wscat`: `wscat -c ws://localhost:3000/gateway`

### GPIO Permission Errors

```bash
# Raspberry Pi: Enable GPIO access
sudo raspi-config
# Interface Options → GPIO → Enable
```

## Further Reading

- [GRBL Documentation](https://github.com/gnea/grbl/wiki)
- [Marlin Firmware](https://marlinfw.org/)
- [SerialPort npm](https://serialport.io/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Raspberry Pi GPIO](https://pinout.xyz/)
