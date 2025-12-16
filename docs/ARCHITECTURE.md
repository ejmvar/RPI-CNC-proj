# CNC Simulator Architecture

This document provides a comprehensive overview of the CNC Simulator's architecture, design decisions, and system components.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Schema](#database-schema)
- [Module System](#module-system)
- [Communication Patterns](#communication-patterns)
- [Security Architecture](#security-architecture)
- [Performance Considerations](#performance-considerations)
- [Deployment Architecture](#deployment-architecture)

## Overview

The CNC Simulator is a web-based application for simulating CNC machine operations with G-Code, featuring 3D visualization, auto-leveling, and collaborative editing capabilities.

### Key Characteristics

- **Architecture Style:** Hybrid (static frontend + REST/WebSocket backend)
- **Frontend:** Vanilla JavaScript with ES modules
- **Backend:** Node.js with Express and PostgreSQL
- **Real-time:** WebSocket for collaboration
- **Rendering:** Three.js for 3D graphics
- **Deployment:** Docker containers (frontend, backend, database)

### Design Principles

1. **Progressive Enhancement** - Core features work offline, advanced features require connection
2. **Modularity** - Clear separation of concerns, reusable components
3. **Performance First** - Optimized for 60fps rendering, lazy loading
4. **Security by Design** - JWT authentication, input validation, rate limiting
5. **Developer Experience** - Clear APIs, comprehensive tests, good documentation

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Browser                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   UI Layer   │  │  3D Canvas   │  │Service Worker│     │
│  │  (HTML/CSS)  │  │  (Three.js)  │  │   (Cache)    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────┴──────────────────┴──────────────────┴───────┐    │
│  │           Application Layer (ES Modules)            │    │
│  │  - GCode Parser    - Theme Manager                  │    │
│  │  - Auth UI         - Keyboard Shortcuts             │    │
│  │  - File Library    - Performance Monitor            │    │
│  └──────┬──────────────────────────────────────┬───────┘    │
└─────────┼──────────────────────────────────────┼────────────┘
          │                                       │
          │ HTTP/REST                             │ WebSocket
          │                                       │
┌─────────┴───────────────────────────────────────┴────────────┐
│                      Backend Services                         │
├───────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐              ┌──────────────────┐      │
│  │   API Server     │              │  WebSocket Server│      │
│  │   (Express)      │              │   (ws library)   │      │
│  │                  │              │                  │      │
│  │ - Auth Routes    │              │ - Collaboration  │      │
│  │ - File Routes    │              │ - Cursor Sync    │      │
│  │ - Folder Routes  │              │ - Live Updates   │      │
│  └────────┬─────────┘              └────────┬─────────┘      │
│           │                                  │                │
│           └──────────┬───────────────────────┘                │
│                      │                                        │
│           ┌──────────┴──────────┐                            │
│           │   Database Layer    │                            │
│           │   (Repositories)    │                            │
│           └──────────┬──────────┘                            │
└──────────────────────┼───────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │   PostgreSQL    │
              │   Database      │
              └─────────────────┘
```

### Component Responsibilities

**Client Browser:**

- Render UI and 3D visualization
- Parse and validate G-Code
- Handle user interactions
- Cache resources offline
- Manage local state

**API Server:**

- User authentication (JWT)
- File CRUD operations
- Folder management
- Authorization checks
- Rate limiting

**WebSocket Server:**

- Real-time collaboration
- Cursor synchronization
- Broadcast updates
- Connection management

**Database:**

- Persistent storage
- User accounts
- G-Code files and folders
- Metadata and permissions

## Frontend Architecture

### File Structure

```
Simulator/web/
├── front.html              # Main application entry point
├── service-worker.js       # PWA offline support
├── manifest.json           # PWA manifest
├── js/                     # JavaScript modules
│   ├── auth-ui.mjs         # Authentication UI
│   ├── camera-bookmarks.mjs
│   ├── controls.mjs        # Orbit controls
│   ├── file-library-ui.mjs # File browser
│   ├── gcode-parser.mjs    # G-Code parsing
│   ├── gcode-transform.mjs # Mesh compensation
│   ├── keyboard-shortcuts.mjs
│   ├── measurement-tools.mjs
│   ├── mesh.mjs            # Bed mesh management
│   ├── performance-monitor.mjs
│   ├── pwa-installer.mjs
│   ├── screenshot-exporter.mjs
│   ├── theme-manager.mjs
│   ├── three-helper.mjs    # Three.js scene setup
│   ├── toolpath.mjs        # Toolpath visualization
│   ├── user-preferences.mjs
│   ├── viewport-manager.mjs
│   └── webgl-optimizer.mjs
├── css/                    # Stylesheets
│   ├── theme.css           # Theme system (light/dark)
│   ├── auth-ui.css
│   ├── file-library-ui.css
│   ├── keyboard-shortcuts.css
│   ├── performance.css
│   ├── user-preferences.css
│   └── visualization.css
└── static/                 # Static assets
    ├── three.min.js
    └── tailwind/
```

### Module Dependencies

```
front.html
  ├─> three.min.js (Three.js library)
  ├─> theme-manager.mjs
  │     └─> localStorage (theme persistence)
  ├─> keyboard-shortcuts.mjs
  │     └─> user-preferences.mjs
  ├─> auth-ui.mjs
  │     ├─> fetch (API calls)
  │     └─> localStorage (token storage)
  ├─> file-library-ui.mjs
  │     ├─> auth-ui.mjs (authentication)
  │     └─> fetch (file API)
  ├─> three-helper.mjs
  │     ├─> THREE (Three.js)
  │     └─> controls.mjs
  ├─> gcode-parser.mjs
  │     └─> core parser logic
  ├─> gcode-transform.mjs
  │     ├─> gcode-parser.mjs
  │     └─> mesh.mjs
  ├─> toolpath.mjs
  │     └─> THREE (Three.js)
  ├─> camera-bookmarks.mjs
  │     ├─> THREE (camera)
  │     └─> localStorage
  ├─> measurement-tools.mjs
  │     └─> THREE (raycasting, geometry)
  ├─> viewport-manager.mjs
  │     └─> THREE (renderer, camera)
  ├─> screenshot-exporter.mjs
  │     └─> Clipboard API
  ├─> performance-monitor.mjs
  │     └─> performance API
  ├─> webgl-optimizer.mjs
  │     └─> THREE (renderer info)
  └─> pwa-installer.mjs
        └─> Service Worker API
```

### Data Flow

#### G-Code Processing Pipeline

```
User Input (textarea)
  │
  ├─> parseGCode(text)
  │     ├─> Tokenize lines
  │     ├─> Parse commands
  │     └─> Return command array
  │
  ├─> applyMeshLeveling(commands, mesh)
  │     ├─> For each G0/G1 command
  │     ├─> Get Z offset from mesh
  │     └─> Adjust Z coordinate
  │
  ├─> buildToolpath(commands)
  │     ├─> Create line geometry
  │     ├─> Color by move type
  │     └─> Add to scene
  │
  └─> simulateExecution(commands)
        ├─> Animate tool position
        ├─> Update UI indicators
        └─> Render frame
```

#### Authentication Flow

```
User Login
  │
  ├─> AuthUI.login(email, password)
  │     ├─> POST /api/auth/login
  │     ├─> Receive JWT token
  │     └─> Store in localStorage
  │
  ├─> Set Authorization header
  │
  └─> Enable authenticated features
        ├─> File library access
        ├─> Collaboration features
        └─> User preferences sync
```

### State Management

**Local State (in-memory):**

- Current tool position
- Scene objects (tool, toolpath, grid)
- Animation state (playing, paused)
- UI state (modal visibility, selected items)

**Persistent State (localStorage):**

- User theme preference
- Camera bookmarks
- User preferences (grid, axes, speeds)
- Recent files
- Auth token

**Server State (API):**

- User account
- G-Code files
- Folders
- File metadata

## Backend Architecture

### Server Structure

```
modules/backend/
├── routes/                 # Express routes
│   ├── auth.mjs            # /api/auth/*
│   ├── files.mjs           # /api/files/*
│   └── folders.mjs         # /api/folders/*
├── database/
│   ├── connection.mjs      # Database connection pool
│   ├── migrations/         # SQL migration scripts
│   └── repositories/       # Data access layer
│       ├── UserRepository.mjs
│       ├── GCodeFileRepository.mjs
│       └── GCodeFolderRepository.mjs
├── middleware/
│   ├── authenticate.mjs    # JWT verification
│   ├── rateLimit.mjs       # Request rate limiting
│   └── errorHandler.mjs    # Error handling
├── websocket-server.mjs    # WebSocket collaboration
└── metrics.mjs             # Prometheus metrics
```

### API Architecture

**RESTful Design:**

- Resource-based URLs
- HTTP methods (GET, POST, PUT, DELETE)
- JSON request/response bodies
- Consistent error responses

**Endpoints:**

```
Authentication:
  POST   /api/auth/register      Create account
  POST   /api/auth/login         Login
  POST   /api/auth/logout        Logout
  GET    /api/auth/me            Get current user

Files:
  GET    /api/files              List files (paginated)
  GET    /api/files/search       Search files
  GET    /api/files/stats        User statistics
  GET    /api/files/:id          Get file details
  POST   /api/files              Create file
  PUT    /api/files/:id          Update metadata
  PUT    /api/files/:id/content  Update content (version)
  DELETE /api/files/:id          Delete file
  POST   /api/files/:id/duplicate Duplicate file
  GET    /api/files/:id/versions Get version history

Folders:
  GET    /api/folders            List folders
  GET    /api/folders/tree       Get folder tree
  GET    /api/folders/:id        Get folder
  POST   /api/folders            Create folder
  PUT    /api/folders/:id        Update folder
  DELETE /api/folders/:id        Delete folder
```

### Database Schema

**Users Table:**

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**G-Code Files Table:**

```sql
CREATE TABLE gcode_files (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES gcode_folders(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  tags TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  size_bytes INTEGER,
  line_count INTEGER,
  version INTEGER DEFAULT 1,
  parent_version_id INTEGER REFERENCES gcode_files(id),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gcode_files_user_id ON gcode_files(user_id);
CREATE INDEX idx_gcode_files_folder_id ON gcode_files(folder_id);
CREATE INDEX idx_gcode_files_tags ON gcode_files USING GIN(tags);
```

**Folders Table:**

```sql
CREATE TABLE gcode_folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  parent_folder_id INTEGER REFERENCES gcode_folders(id),
  name VARCHAR(255) NOT NULL,
  path TEXT,
  file_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  last_upload_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gcode_folders_user_id ON gcode_folders(user_id);
CREATE INDEX idx_gcode_folders_parent ON gcode_folders(parent_folder_id);
```

### Repository Pattern

Repositories provide a clean abstraction over database operations:

```javascript
class GCodeFileRepository {
  constructor(db) {
    this.db = db;
  }

  async findById(id, userId) {
    const result = await this.db.query('SELECT * FROM gcode_files WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    return result.rows[0];
  }

  async create({ userId, filename, content, tags, folderId }) {
    const result = await this.db.query(
      `INSERT INTO gcode_files 
       (user_id, filename, content, tags, folder_id, size_bytes) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userId, filename, content, tags, folderId, content.length]
    );
    return result.rows[0];
  }

  // ... more methods
}
```

### WebSocket Protocol

**Connection:**

```
Client -> Server: WebSocket handshake
Server -> Client: Connection accepted
```

**Message Format:**

```json
{
  "type": "cursor_move",
  "payload": {
    "x": 150,
    "y": 200,
    "userId": "user123"
  },
  "timestamp": 1702656000000
}
```

**Message Types:**

- `cursor_move` - User cursor position
- `file_update` - File content change
- `user_join` - User joined session
- `user_leave` - User left session
- `selection_change` - Text selection changed

## Module System

### Core Modules

**modules/gcode/**

- `parser.mjs` - Parse G-Code text to commands
- `transform.mjs` - Apply mesh compensation
- `toolpath.mjs` - Generate 3D toolpath visualization

**modules/presentation/**

- `three-helper.mjs` - Three.js scene initialization
- `controls.mjs` - Orbit camera controls
- `mesh.mjs` - Bed mesh management

**modules/backend/**

- API routes, database, WebSocket server

**modules/cli/**

- Command-line utilities (future)

### Browser Wrappers

ES modules in `Simulator/web/js/` act as browser wrappers:

- Import from `modules/`
- Expose on `window` object for debugging
- Handle browser-specific concerns

Example:

```javascript
// Simulator/web/js/gcode-parser.mjs
import { parseGCode } from '../../../modules/gcode/parser.mjs';

window.parseGCode = parseGCode; // Debug access
export { parseGCode };
```

## Communication Patterns

### Request/Response (REST)

```
Client                    Server
  │─────── POST ─────────>│
  │   /api/auth/login     │
  │   {email, password}   │
  │                       │
  │<────── 200 OK ────────│
  │   {token, user}       │
```

### Pub/Sub (WebSocket)

```
Client A         Server          Client B
  │────── Join ────>│                │
  │                 │<──── Join ─────│
  │                 │                │
  │─── cursor_move ─>│                │
  │                 │─ cursor_move ──>│
  │                 │                │
  │<─ cursor_move ───│─── cursor_move ─>│
```

### Event-Driven (Frontend)

```javascript
// Emit custom event
document.dispatchEvent(
  new CustomEvent('themechange', {
    detail: { theme: 'dark' },
  })
);

// Listen for event
document.addEventListener('themechange', (e) => {
  console.log('Theme changed to:', e.detail.theme);
});
```

## Security Architecture

### Authentication

**JWT (JSON Web Tokens):**

- Issued on login
- Stored in localStorage
- Sent in Authorization header
- Verified on every API request

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Structure:**

```json
{
  "userId": 123,
  "email": "user@example.com",
  "iat": 1702656000,
  "exp": 1702742400
}
```

### Authorization

**Ownership checks:**

```javascript
async function getFile(req, res) {
  const { id } = req.params;
  const { userId } = req.user; // From JWT

  const file = await fileRepo.findById(id, userId);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.json(file);
}
```

### Input Validation

**Sanitization:**

- Escape HTML in user input
- Validate file sizes
- Check filename patterns
- Limit tags array length

**Example:**

```javascript
const schema = {
  filename: {
    type: 'string',
    minLength: 1,
    maxLength: 255,
    pattern: '^[a-zA-Z0-9._-]+$',
  },
  content: {
    type: 'string',
    maxLength: 1048576, // 1MB
  },
};
```

### Rate Limiting

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests, please try again later',
});

app.use('/api/', limiter);
```

### CORS

```javascript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
  })
);
```

## Performance Considerations

### Frontend Optimization

**Three.js:**

- Pixel ratio capped at 2
- Frustum culling enabled
- Geometry instancing for repeated objects
- Dispose unused geometries/materials

**Bundle Size:**

- No build step (ES modules in browser)
- Local Three.js copy (no CDN dependency)
- Lazy loading for non-critical features

**Caching:**

- Service Worker caches static assets
- localStorage for user preferences
- IndexedDB for large data (future)

### Backend Optimization

**Database:**

- Connection pooling (pg)
- Indexed queries (user_id, folder_id, tags)
- Prepared statements
- Query result pagination

**API:**

- Compression middleware (gzip)
- Response caching headers
- Efficient JSON serialization

**WebSocket:**

- Message batching
- Connection pooling
- Heartbeat/ping-pong

## Deployment Architecture

### Docker Compose Setup

```yaml
version: '3.8'
services:
  frontend:
    image: nginx:alpine
    volumes:
      - ./Simulator/web:/usr/share/nginx/html:ro
    ports:
      - '8080:80'

  backend:
    build: .
    environment:
      - DATABASE_URL
      - JWT_SECRET
    ports:
      - '3000:3000'
      - '3001:3001'
    depends_on:
      - database

  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=cnc_simulator
      - POSTGRES_USER=cnc_user
      - POSTGRES_PASSWORD=cnc_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - '5432:5432'
```

### Scaling Considerations

**Horizontal Scaling:**

- Stateless API servers (JWT auth)
- WebSocket server requires sticky sessions
- PostgreSQL read replicas for queries

**Vertical Scaling:**

- Increase database connections
- More worker processes (cluster mode)
- Larger instance types

**Caching Layer (future):**

- Redis for session storage
- Memcached for query results
- CDN for static assets

## Future Architecture

### Microservices (Phase 11+)

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Auth      │  │   Files     │  │  Collab     │
│  Service    │  │  Service    │  │  Service    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
               ┌────────┴────────┐
               │   API Gateway   │
               └─────────────────┘
```

### Event Sourcing

- Audit trail of all file changes
- Replay events to reconstruct state
- CQRS pattern (separate read/write)

### Real-time Analytics

- Prometheus metrics
- Grafana dashboards
- Error tracking (Sentry)
- Usage analytics

---

## Questions?

For more details on specific components, see:

- [API.md](API.md) - API reference
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [PERFORMANCE.md](PERFORMANCE.md) - Performance optimization

Or open a GitHub Discussion!
