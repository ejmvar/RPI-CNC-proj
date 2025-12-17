/**
 * External Tool Integration Tests
 * Phase 15.3: External Tool Integration
 */

/* eslint-disable no-undef */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { RESTAPIServer } from '../../../modules/external/rest-api-server.mjs';
import { FreeCADPlugin } from '../../../modules/external/freecad-plugin.mjs';
import { Fusion360Integration } from '../../../modules/external/fusion360-integration.mjs';
import { KiCadIntegration } from '../../../modules/external/kicad-integration.mjs';

describe('RESTAPIServer', () => {
  let server;

  beforeEach(() => {
    server = new RESTAPIServer({ port: 3000 });
  });

  test('should create REST API server', () => {
    expect(server).toBeDefined();
    expect(server.options.port).toBe(3000);
    expect(server.isRunning).toBe(false);
  });

  test('should start server', () => {
    const result = server.start();
    expect(result.port).toBe(3000);
    expect(server.isRunning).toBe(true);
  });

  test('should stop server', () => {
    server.start();
    const result = server.stop();
    expect(result.stopped).toBe(true);
    expect(server.isRunning).toBe(false);
  });

  test('should handle G-Code upload', () => {
    const req = { body: { gcode: 'G0 X10 Y20\nG1 Z-5 F150' } };
    const res = server.handleGCodeUpload(req);
    expect(res.statusCode).toBe(201);
    expect(res.lines).toBe(2);
  });

  test('should validate G-Code', () => {
    const req = { body: { gcode: 'G0 X10 Y20\nG1 Z-5 F150' } };
    const res = server.handleGCodeValidate(req);
    expect(res.statusCode).toBe(200);
    expect(res.isValid).toBe(true);
  });

  test('should optimize G-Code', () => {
    const req = { body: { gcode: 'G0 X0 Y0\nG0 X0 Y0\nG1 Z-5 F150' } };
    const res = server.handleGCodeOptimize(req);
    expect(res.statusCode).toBe(200);
    expect(res.algorithm).toBeDefined();
  });

  test('should handle simulation start', () => {
    const req = { body: { gcode: 'G0 X10 Y20' } };
    const res = server.handleSimulationStart(req);
    expect(res.statusCode).toBe(200);
    expect(res.simId).toBeDefined();
    expect(res.status).toBe('running');
  });

  test('should get tool library', () => {
    const res = server.handleGetTools();
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.tools)).toBe(true);
    expect(res.tools.length).toBeGreaterThan(0);
  });

  test('should create new tool', () => {
    const req = { body: { name: 'Test Bit', type: 'end-mill', diameter: 3.175 } };
    const res = server.handleCreateTool(req);
    expect(res.statusCode).toBe(201);
    expect(res.id).toBeDefined();
    expect(res.name).toBe('Test Bit');
  });

  test('should emit events', (done) => {
    server.on('gcode:uploaded', (data) => {
      expect(data.id).toBeDefined();
      done();
    });

    const req = { body: { gcode: 'G0 X10 Y20' } };
    server.handleGCodeUpload(req);
  });

  test('should broadcast WebSocket messages', () => {
    server.start();
    const mockClient = { send: jest.fn() };
    server.wsClients.add(mockClient);

    server.broadcast('test-event', { message: 'hello' });

    expect(mockClient.send).toHaveBeenCalled();
    const callArgs = mockClient.send.mock.calls[0][0];
    const parsed = JSON.parse(callArgs);
    expect(parsed.event).toBe('test-event');
  });

  test('should return server status', () => {
    server.start();
    const res = server.handleStatus();
    expect(res.statusCode).toBe(200);
    expect(res.running).toBe(true);
    expect(res.port).toBe(3000);
  });
});

describe('FreeCADPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new FreeCADPlugin();
  });

  test('should create FreeCAD plugin', () => {
    expect(plugin).toBeDefined();
    expect(plugin.isConnected).toBe(false);
  });

  test('should connect to FreeCAD', () => {
    const res = plugin.connect();
    expect(res.connected).toBe(true);
    expect(plugin.isConnected).toBe(true);
  });

  test('should disconnect from FreeCAD', () => {
    plugin.connect();
    const res = plugin.disconnect();
    expect(res.disconnected).toBe(true);
    expect(plugin.isConnected).toBe(false);
  });

  test('should import CAM job', () => {
    plugin.connect();
    const job = plugin.importCAMJob('Test Job', 'G0 X0 Y0');
    expect(job.id).toBeDefined();
    expect(job.name).toBe('Test Job');
    expect(job.source).toBe('freecad');
  });

  test('should sync tool library', () => {
    plugin.connect();
    const tools = [
      { id: '1', name: 'Tool 1', type: 'end-mill' },
      { id: '2', name: 'Tool 2', type: 'v-bit' },
    ];
    const res = plugin.syncToolLibrary(tools);
    expect(res.synced).toBe(true);
    expect(res.count).toBe(2);
  });

  test('should get tool from library', () => {
    plugin.connect();
    const tools = [{ id: '1', name: 'Test Tool', type: 'end-mill' }];
    plugin.syncToolLibrary(tools);
    const tool = plugin.getTool('1');
    expect(tool).toBeDefined();
    expect(tool.name).toBe('Test Tool');
  });

  test('should start sync', () => {
    plugin.connect();
    const res = plugin.startSync(500);
    expect(res.syncing).toBe(true);
    expect(plugin.isSyncing()).toBe(true);
  });

  test('should stop sync', () => {
    plugin.connect();
    plugin.startSync();
    const res = plugin.stopSync();
    expect(res.syncing).toBe(false);
    expect(plugin.isSyncing()).toBe(false);
  });

  test('should list jobs', () => {
    plugin.connect();
    plugin.importCAMJob('Job 1', 'G0 X0 Y0');
    const res = plugin.listJobs();
    expect(Array.isArray(res.jobs)).toBe(true);
    expect(res.count).toBeGreaterThan(0);
  });

  test('should delete job', () => {
    plugin.connect();
    const job = plugin.importCAMJob('Job 1', 'G0 X0 Y0');
    const res = plugin.deleteJob(job.id);
    expect(res.deleted).toBe(true);
  });
});

describe('Fusion360Integration', () => {
  let fusion;

  beforeEach(() => {
    fusion = new Fusion360Integration({ apiKey: 'test-key' });
  });

  test('should create Fusion 360 integration', () => {
    expect(fusion).toBeDefined();
    expect(fusion.isAuthenticated).toBe(false);
  });

  test('should authenticate', () => {
    const res = fusion.authenticate();
    expect(res.authenticated).toBe(true);
    expect(res.accessToken).toBeDefined();
    expect(fusion.isAuthenticated).toBe(true);
  });

  test('should connect to project', () => {
    fusion.authenticate();
    const res = fusion.connectToProject('proj-001');
    expect(res.connected).toBe(true);
    expect(res.projectId).toBe('proj-001');
    expect(fusion.isConnected).toBe(true);
  });

  test('should disconnect', () => {
    fusion.authenticate();
    fusion.connectToProject('proj-001');
    const res = fusion.disconnect();
    expect(res.disconnected).toBe(true);
    expect(fusion.isConnected).toBe(false);
  });

  test('should list projects', () => {
    fusion.authenticate();
    const res = fusion.listProjects();
    expect(Array.isArray(res.projects)).toBe(true);
    expect(res.projects.length).toBeGreaterThan(0);
  });

  test('should get CAM operations', () => {
    fusion.authenticate();
    const res = fusion.getCAMOperations('proj-001');
    expect(Array.isArray(res.operations)).toBe(true);
    expect(res.operations.length).toBeGreaterThan(0);
  });

  test('should export G-Code', () => {
    fusion.authenticate();
    const res = fusion.exportGCode('proj-001', 'op-001');
    expect(res.gcode).toBeDefined();
    expect(res.projectId).toBe('proj-001');
  });

  test('should import G-Code', () => {
    fusion.authenticate();
    const res = fusion.importGCode('proj-001', 'G0 X0 Y0');
    expect(res.importId).toBeDefined();
    expect(res.projectId).toBe('proj-001');
  });

  test('should sync tool library', () => {
    fusion.authenticate();
    const res = fusion.syncToolLibrary('proj-001');
    expect(Array.isArray(res.tools)).toBe(true);
    expect(res.count).toBeGreaterThan(0);
  });

  test('should simulate operation', () => {
    fusion.authenticate();
    const res = fusion.simulateOperation('proj-001', 'op-001');
    expect(res.simId).toBeDefined();
    expect(res.estimatedTime).toBeDefined();
  });
});

describe('KiCadIntegration', () => {
  let kicad;

  beforeEach(() => {
    kicad = new KiCadIntegration();
  });

  test('should create KiCad integration', () => {
    expect(kicad).toBeDefined();
    expect(kicad.isConnected).toBe(false);
  });

  test('should connect to KiCad project', () => {
    const res = kicad.connect('/path/to/project');
    expect(res.connected).toBe(true);
    expect(kicad.isConnected).toBe(true);
  });

  test('should disconnect from KiCad', () => {
    kicad.connect('/path/to/project');
    const res = kicad.disconnect();
    expect(res.disconnected).toBe(true);
    expect(kicad.isConnected).toBe(false);
  });

  test('should open board file', () => {
    kicad.connect('/path/to/project');
    const board = kicad.openBoard('/path/to/board.kicad_pcb');
    expect(board.id).toBeDefined();
    expect(board.name).toBe('board.kicad_pcb');
  });

  test('should list boards', () => {
    kicad.connect('/path/to/project');
    kicad.openBoard('/path/to/board1.kicad_pcb');
    const res = kicad.listBoards();
    expect(Array.isArray(res.boards)).toBe(true);
    expect(res.count).toBeGreaterThan(0);
  });

  test('should import drill file', () => {
    kicad.connect('/path/to/project');
    const board = kicad.openBoard('/path/to/board.kicad_pcb');
    const drillData = 'METRIC\nX1000Y2000T01\nX3000Y4000T02';
    const res = kicad.importDrillFile(board.id, drillData);
    expect(res.drillFileId).toBeDefined();
    expect(res.holeCount).toBeGreaterThan(0);
  });

  test('should import Gerber layers', () => {
    kicad.connect('/path/to/project');
    const board = kicad.openBoard('/path/to/board.kicad_pcb');
    const layers = ['F.Cu', 'B.Cu', 'F.SilkS', 'B.SilkS'];
    const res = kicad.importGerberLayers(board.id, layers);
    expect(res.layersImported).toBe(4);
  });

  test('should generate milling strategy', () => {
    kicad.connect('/path/to/project');
    const board = kicad.openBoard('/path/to/board.kicad_pcb');
    const res = kicad.generateMillingStrategy(board.id, { drillBitSize: 1.0 });
    expect(res.strategyId).toBeDefined();
    expect(Array.isArray(res.operations)).toBe(true);
    expect(res.operations.length).toBeGreaterThan(0);
  });

  test('should generate G-Code from strategy', () => {
    kicad.connect('/path/to/project');
    const board = kicad.openBoard('/path/to/board.kicad_pcb');
    const strategy = kicad.generateMillingStrategy(board.id);
    const res = kicad.generateGCode(strategy.strategyId, strategy);
    expect(res.gcode).toBeDefined();
    expect(res.lines).toBeGreaterThan(0);
  });

  test('should parse Excellon drill data', () => {
    kicad.connect('/path/to/project');
    const board = kicad.openBoard('/path/to/board.kicad_pcb');
    const drillData = 'METRIC\nX1000Y2000\nX3000Y4000';
    const res = kicad.importDrillFile(board.id, drillData);
    expect(res.holes).toBeDefined();
    expect(res.holes.length).toBeGreaterThan(0);
  });

  test('should get board info', () => {
    kicad.connect('/path/to/project');
    const board = kicad.openBoard('/path/to/board.kicad_pcb');
    const info = kicad.getBoardInfo(board.id);
    expect(info.id).toBe(board.id);
    expect(info.drillsImported).toBeDefined();
  });

  test('should detect layer types', () => {
    kicad.connect('/path/to/project');
    expect(kicad.detectLayerType('F.Cu')).toBe('copper');
    expect(kicad.detectLayerType('F.SilkS')).toBe('silkscreen');
    expect(kicad.detectLayerType('F.Mask')).toBe('solder-mask');
    expect(kicad.detectLayerType('Edge.Cuts')).toBe('edge-cut');
  });

  test('should emit events', (done) => {
    kicad.connect('/path/to/project');
    kicad.on('board:loaded', (data) => {
      expect(data.boardId).toBeDefined();
      done();
    });
    kicad.openBoard('/path/to/board.kicad_pcb');
  });

  test('should get integration status', () => {
    kicad.connect('/path/to/project');
    kicad.openBoard('/path/to/board.kicad_pcb');
    const status = kicad.getStatus();
    expect(status.connected).toBe(true);
    expect(status.boardsLoaded).toBeGreaterThan(0);
  });
});
