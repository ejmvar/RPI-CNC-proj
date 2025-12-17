# External Tool Integration Module

## Phase 15.3: External Tool Integration

Provides seamless integration with external CAM and PCB design tools.

## Modules

### RESTAPIServer

HTTP REST API server for external tool communication:

- **G-Code Operations**

  - Upload G-Code with validation
  - Validate syntax and commands
  - Optimize G-Code (redundant move removal, collinear combination)
  - Download processed G-Code

- **Simulation Operations**

  - Start, pause, reset simulations
  - Export/import simulation state
  - Real-time state retrieval
  - WebSocket support for live updates

- **Tool Library**

  - Create, read, update, delete tools
  - Synchronize with external tools
  - Tool property management

- **Toolpath Analysis**
  - Analyze toolpath statistics
  - Optimize toolpath
  - Generate performance reports

**Features:**

- Middleware support
- Event system (on/off/emit)
- WebSocket broadcasting
- File size validation
- CORS support
- Health checks and status endpoints

### FreeCADPlugin

Integration with FreeCAD CAM workbench:

- **Job Management**

  - Import CAM jobs from FreeCAD
  - Export simulation results back
  - List and manage multiple jobs
  - Job state tracking

- **Tool Synchronization**

  - Sync FreeCAD tool library
  - Real-time tool updates
  - Tool property validation

- **Automatic Sync**
  - Poll FreeCAD for changes
  - Configurable sync intervals
  - Event notifications

**Features:**

- Connection management
- Tool library synchronization
- Job import/export
- Automatic polling
- Event-driven architecture

### Fusion360Integration

Integration with Autodesk Fusion 360:

- **Authentication**

  - API key authentication
  - OAuth token management
  - Token expiration handling

- **Project Management**

  - List available projects
  - Connect to specific project
  - Project workspace selection

- **CAM Operations**

  - Retrieve CAM operations
  - Export G-Code from operations
  - Import G-Code to project
  - Simulate operations

- **Tool Library**
  - Sync Fusion 360 tool library
  - Tool property validation
  - Real-time updates

**Features:**

- API-based authentication
- Multi-project support
- CAM operation integration
- Tool library synchronization
- Simulation capabilities

### KiCadIntegration

Integration with KiCad for PCB milling:

- **Board Management**

  - Load KiCad board files
  - List available boards
  - Board property access

- **File Import**

  - Excellon drill file parsing
  - Gerber layer import
  - Layer type detection

- **Milling Strategy**

  - Generate drilling operations
  - Generate routing operations
  - Generate cutout operations
  - Configurable tool parameters

- **G-Code Generation**
  - Build G-Code from strategy
  - Operation-based code structure
  - Spindle and feed rate control

**Features:**

- Board file support
- Excellon drill format parsing
- Gerber layer processing
- Milling strategy generation
- Custom G-Code templates

## Usage Example

```javascript
import { RESTAPIServer } from 'modules/external/rest-api-server.mjs';
import { FreeCADPlugin } from 'modules/external/freecad-plugin.mjs';
import { Fusion360Integration } from 'modules/external/fusion360-integration.mjs';
import { KiCadIntegration } from 'modules/external/kicad-integration.mjs';

// Start REST API server
const server = new RESTAPIServer({ port: 3000 });
server.start();

// FreeCAD integration
const freecad = new FreeCADPlugin();
freecad.connect();
const job = freecad.importCAMJob('My Project', 'G0 X0 Y0');

// Fusion 360 integration
const fusion = new Fusion360Integration({ apiKey: 'your-api-key' });
fusion.authenticate();
fusion.listProjects();

// KiCad integration
const kicad = new KiCadIntegration();
kicad.connect('/path/to/kicad/project');
const board = kicad.openBoard('/path/to/board.kicad_pcb');
```

## Test Coverage

- **RESTAPIServer:** 12 tests
- **FreeCADPlugin:** 10 tests
- **Fusion360Integration:** 10 tests
- **KiCadIntegration:** 16 tests

**Total:** 48 tests in `tests/ut/external/external.test.mjs`

## Architecture

All modules follow consistent patterns:

- **Event System:** on/off/emit for reactive updates
- **Connection Management:** connect/disconnect lifecycle
- **ID Generation:** Unique IDs for all resources
- **Error Handling:** Validation and error messages
- **Status Checks:** getStatus() for integration health

## Integration Points

- REST API for HTTP-based communication
- WebSocket support for real-time updates
- Event listeners for tool changes
- Job and project management
- Tool library synchronization
