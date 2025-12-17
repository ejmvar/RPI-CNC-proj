# Desktop Module

**Phase 15.1: Desktop Application**

This module provides Electron-based desktop application wrapper for the CNC simulator, enabling native file system and serial port access.

## Components

- **electron-app.mjs** — Main Electron process, window management, IPC handling
- **electron-preload.mjs** — Preload script for secure context bridge
- **file-system-api.mjs** — Native file system operations
- **serial-port-api.mjs** — Serial port communication for GRBL
- **app-config.mjs** — Application configuration and paths

## Features

- Native file system access (open, save, watch files)
- Serial port enumeration and communication
- Window management and state persistence
- Auto-update support
- App menu with standard commands
- Tray icon support

## Usage

```javascript
import { ElectronApp } from './electron-app.mjs';
import { FileSystemAPI } from './file-system-api.mjs';
import { SerialPortAPI } from './serial-port-api.mjs';

const app = new ElectronApp();
const fileSystem = new FileSystemAPI();
const serialPort = new SerialPortAPI();
```

## IPC Channels

- `file:open` — Open file dialog and read file
- `file:save` — Save file dialog and write file
- `file:watch` — Watch file for changes
- `serial:list` — List available serial ports
- `serial:connect` — Connect to serial port
- `serial:send` — Send data to serial port
- `serial:disconnect` — Disconnect from serial port
- `app:minimize` — Minimize window
- `app:maximize` — Maximize window
- `app:close` — Close window
