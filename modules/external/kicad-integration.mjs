/**
 * KiCad PCB Milling Integration
 * Phase 15.3: External Tool Integration
 *
 * Provides integration with KiCad for:
 * - PCB design import
 * - Drill file conversion (Excellon)
 * - Gerber file processing
 * - Milling strategy generation
 */

export class KiCadIntegration {
  constructor(options = {}) {
    this.options = {
      baseDir: options.baseDir || './kicad-projects',
      enableGerber: options.enableGerber !== false,
      enableDrill: options.enableDrill !== false,
      unitSystem: options.unitSystem || 'mm',
      ...options,
    };

    this.isConnected = false;
    this.listeners = {};
    this.projects = [];
    this.boards = new Map();
    this.drillFiles = [];
    this.gerberLayers = [];
  }

  /**
   * Connect to KiCad project directory
   */
  connect(projectPath) {
    if (this.isConnected) {
      throw new Error('Already connected');
    }

    if (!projectPath) {
      throw new Error('Project path required');
    }

    this.isConnected = true;
    this.emit('connected', { projectPath });

    return {
      connected: true,
      projectPath,
      unitSystem: this.options.unitSystem,
    };
  }

  /**
   * Disconnect from KiCad
   */
  disconnect() {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    this.isConnected = false;
    this.boards.clear();
    this.drillFiles = [];
    this.gerberLayers = [];
    this.emit('disconnected', {});

    return { disconnected: true };
  }

  /**
   * Open KiCad board file
   */
  openBoard(boardPath) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    if (!boardPath) {
      throw new Error('Board path required');
    }

    const boardId = this.generateId();
    const board = {
      id: boardId,
      path: boardPath,
      name: boardPath.split('/').pop(),
      layers: 2,
      dxf: false,
      loaded: new Date().toISOString(),
    };

    this.boards.set(boardId, board);
    this.emit('board:loaded', { boardId, path: boardPath });

    return board;
  }

  /**
   * List available boards
   */
  listBoards() {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    const boardsList = Array.from(this.boards.values()).map((b) => ({
      id: b.id,
      name: b.name,
      layers: b.layers,
      loaded: b.loaded,
    }));

    return { boards: boardsList, count: boardsList.length };
  }

  /**
   * Import drill file (Excellon format)
   */
  importDrillFile(boardId, drillData) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    if (!boardId || !drillData) {
      throw new Error('Board ID and drill data required');
    }

    const board = this.boards.get(boardId);
    if (!board) {
      throw new Error(`Board not found: ${boardId}`);
    }

    // Parse drill data
    const holes = this.parseDrillData(drillData);

    const drillFile = {
      id: this.generateId(),
      boardId,
      format: 'excellon',
      holeCount: holes.length,
      holes,
      imported: new Date().toISOString(),
    };

    this.drillFiles.push(drillFile);
    this.emit('drill:imported', { boardId, holeCount: holes.length });

    return {
      drillFileId: drillFile.id,
      boardId,
      holeCount: holes.length,
      holes: holes.slice(0, 5), // Return first 5 holes as sample
    };
  }

  /**
   * Import Gerber layers
   */
  importGerberLayers(boardId, layers) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    if (!boardId || !layers || !Array.isArray(layers)) {
      throw new Error('Board ID and layers array required');
    }

    const board = this.boards.get(boardId);
    if (!board) {
      throw new Error(`Board not found: ${boardId}`);
    }

    const importedLayers = layers.map((layer) => ({
      id: this.generateId(),
      boardId,
      name: layer,
      type: this.detectLayerType(layer),
      imported: new Date().toISOString(),
    }));

    this.gerberLayers.push(...importedLayers);
    this.emit('gerber:imported', { boardId, layerCount: importedLayers.length });

    return {
      layersImported: importedLayers.length,
      layers: importedLayers.map((l) => ({ name: l.name, type: l.type })),
    };
  }

  /**
   * Generate milling strategy for PCB
   */
  generateMillingStrategy(boardId, options = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    if (!boardId) {
      throw new Error('Board ID required');
    }

    const board = this.boards.get(boardId);
    if (!board) {
      throw new Error(`Board not found: ${boardId}`);
    }

    const strategy = {
      strategyId: this.generateId(),
      boardId,
      operations: [
        {
          id: 'op-drill',
          type: 'drill',
          description: 'Drill via holes',
          toolDiameter: options.drillBitSize || 1.0,
          feedRate: options.drillFeed || 50,
          spindle: options.drillSpindle || 6000,
        },
        {
          id: 'op-route',
          type: 'route',
          description: 'Route board outline',
          toolDiameter: options.bitSize || 2.0,
          feedRate: options.feedRate || 100,
          spindle: options.spindle || 12000,
        },
        {
          id: 'op-cutout',
          type: 'cutout',
          description: 'Cut board cutout',
          toolDiameter: options.bitSize || 2.0,
          feedRate: options.feedRate || 80,
          spindle: options.spindle || 12000,
        },
      ],
      generated: new Date().toISOString(),
    };

    this.emit('strategy:generated', { boardId, operationCount: strategy.operations.length });

    return strategy;
  }

  /**
   * Generate G-Code from milling strategy
   */
  generateGCode(strategyId, strategy) {
    if (!strategyId || !strategy) {
      throw new Error('Strategy ID and strategy object required');
    }

    const gcode = this.buildGCode(strategy);

    this.emit('gcode:generated', { strategyId, lines: gcode.split('\n').length });

    return {
      gcode,
      strategyId,
      lines: gcode.split('\n').length,
      estimatedTime: 450.5,
    };
  }

  /**
   * Build G-Code from strategy
   */
  buildGCode(strategy) {
    const lines = ['; KiCad PCB Milling G-Code', '; Generated from milling strategy', ''];

    // Add operation comments and basic moves
    strategy.operations.forEach((op) => {
      lines.push(`; Operation: ${op.description}`);
      lines.push(`; Tool: ${op.toolDiameter}mm`);
      lines.push(`; Feed: ${op.feedRate} mm/min`);
      lines.push(`; Spindle: ${op.spindle} RPM`);
      lines.push('M3 S' + op.spindle);
      lines.push('G0 Z5');
      lines.push('G1 F' + op.feedRate);
      lines.push('');
    });

    lines.push('G0 Z10');
    lines.push('M5');
    lines.push('M30');

    return lines.join('\n');
  }

  /**
   * Parse Excellon drill file format
   */
  parseDrillData(drillData) {
    const holes = [];
    const lines = drillData.split('\n');

    let unitMultiplier = 1; // Default mm
    let inchMode = false;

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Detect unit mode
      if (trimmed === 'INCH') {
        inchMode = true;
        unitMultiplier = 25.4;
      }
      if (trimmed === 'METRIC') {
        inchMode = false;
        unitMultiplier = 1;
      }

      // Parse hole coordinates (X/Y format)
      const match = trimmed.match(/^X([\d.]+)Y([\d.]+)(?:T(\d+))?/i);
      if (match) {
        holes.push({
          x: (parseFloat(match[1]) / 1000) * unitMultiplier,
          y: (parseFloat(match[2]) / 1000) * unitMultiplier,
          tool: match[3] || '1',
        });
      }
    });

    return holes;
  }

  /**
   * Detect layer type from name
   */
  detectLayerType(layerName) {
    const lower = layerName.toLowerCase();
    if (lower.includes('edge') || lower.includes('board') || lower.includes('cuts'))
      return 'edge-cut';
    if (lower.includes('copper') || lower.includes('cu')) return 'copper';
    if (lower.includes('silkscreen') || lower.includes('silk')) return 'silkscreen';
    if (lower.includes('mask') || lower.includes('solder')) return 'solder-mask';
    return 'other';
  }

  /**
   * Get board info
   */
  getBoardInfo(boardId) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    const board = this.boards.get(boardId);
    if (!board) {
      throw new Error(`Board not found: ${boardId}`);
    }

    return {
      ...board,
      drillsImported: this.drillFiles.filter((d) => d.boardId === boardId).length,
      layersImported: this.gerberLayers.filter((l) => l.boardId === boardId).length,
    };
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      boardsLoaded: this.boards.size,
      drillFilesImported: this.drillFiles.length,
      gerberLayersImported: this.gerberLayers.length,
      baseDir: this.options.baseDir,
    };
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `kicad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }
}
