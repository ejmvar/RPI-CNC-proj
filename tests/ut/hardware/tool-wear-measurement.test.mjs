import { ToolWearMeasurementSystem } from '../../../modules/hardware/tool-wear-measurement.mjs';

describe('ToolWearMeasurementSystem', () => {
  let system;

  beforeEach(() => {
    system = new ToolWearMeasurementSystem();
  });

  // ===== Tool Registration Tests =====
  describe('Tool Registration', () => {
    test('should register a tool', () => {
      const result = system.registerTool('tool-001', {
        type: 'end_mill',
        material: 'HSS',
        diameter: 10,
      });
      expect(result).toBe(true);
      expect(system.tools.size).toBe(1);
    });

    test('should throw on invalid registration', () => {
      expect(() => system.registerTool('', {})).toThrow();
    });

    test('should throw on duplicate tool', () => {
      system.registerTool('tool-001', {
        type: 'end_mill',
      });
      expect(() =>
        system.registerTool('tool-001', {
          type: 'end_mill',
        })
      ).toThrow();
    });

    test('should emit tool registered event', (done) => {
      system.on('toolRegistered', (data) => {
        expect(data.toolId).toBe('tool-001');
        done();
      });
      system.registerTool('tool-001', {
        type: 'end_mill',
      });
    });

    test('should register multiple tools', () => {
      system.registerTool('tool-001', { type: 'end_mill' });
      system.registerTool('tool-002', { type: 'ball_nose' });
      expect(system.tools.size).toBe(2);
    });
  });

  // ===== Flank Wear Tests =====
  describe('Flank Wear Measurement', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
        material: 'HSS',
      });
    });

    test('should record flank wear', () => {
      const result = system.recordFlankWear('tool-001', 0.1);
      expect(result).not.toBeNull();
      expect(result.vbbValue).toBe(0.1);
      expect(result.type).toBe('flank_wear');
    });

    test('should throw on negative wear value', () => {
      expect(() => system.recordFlankWear('tool-001', -0.1)).toThrow();
    });

    test('should calculate wear percentage', () => {
      const result = system.recordFlankWear('tool-001', 0.25);
      expect(result.wearPercent).toBeGreaterThan(0);
    });

    test('should detect warning severity', () => {
      // Record to reach 70% wear
      const vbbThreshold = 0.5;
      system.recordFlankWear('tool-001', vbbThreshold * 0.7);
      const result = system.recordFlankWear('tool-001', vbbThreshold * 0.75);
      expect(result.severity).toBe('warning');
    });

    test('should detect critical severity', () => {
      const vbbThreshold = 0.5;
      const result = system.recordFlankWear('tool-001', vbbThreshold * 0.92);
      expect(result.severity).toBe('critical');
    });

    test('should emit wear warning event', (done) => {
      system.on('wearWarning', (data) => {
        expect(data.toolId).toBe('tool-001');
        expect(data.severity).not.toBe('normal');
        done();
      });
      const threshold = 0.5;
      system.recordFlankWear('tool-001', threshold * 0.8);
    });
  });

  // ===== Crater Wear Tests =====
  describe('Crater Wear Measurement', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
      });
    });

    test('should record crater wear', () => {
      const result = system.recordCraterWear('tool-001', 0.05);
      expect(result).not.toBeNull();
      expect(result.vbcValue).toBe(0.05);
      expect(result.type).toBe('crater_wear');
    });

    test('should throw on negative wear value', () => {
      expect(() => system.recordCraterWear('tool-001', -0.05)).toThrow();
    });

    test('should emit crater wear warning', (done) => {
      system.on('craterWearWarning', (data) => {
        expect(data.toolId).toBe('tool-001');
        done();
      });
      const threshold = 0.3;
      system.recordCraterWear('tool-001', threshold * 0.8);
    });
  });

  // ===== Breakage Detection Tests =====
  describe('Breakage Detection', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
      });
    });

    test('should detect breakage from acoustic data', () => {
      const detected = system.detectBreakage('tool-001', {
        acousticPeak: 85,
        vibrationAmplitude: 2.0,
        cuttingForce: 5000,
      });
      expect(detected).toBe(true);
    });

    test('should detect breakage from vibration', () => {
      const detected = system.detectBreakage('tool-001', {
        acousticPeak: 50,
        vibrationAmplitude: 6.0,
        cuttingForce: 5000,
      });
      expect(detected).toBe(true);
    });

    test('should detect breakage from force anomaly', () => {
      const detected = system.detectBreakage('tool-001', {
        acousticPeak: 50,
        vibrationAmplitude: 2.0,
        cuttingForce: 15000,
      });
      expect(detected).toBe(true);
    });

    test('should not detect normal operation', () => {
      const detected = system.detectBreakage('tool-001', {
        acousticPeak: 40,
        vibrationAmplitude: 1.0,
        cuttingForce: 5000,
      });
      expect(detected).toBe(false);
    });

    test('should emit breakage detected event', (done) => {
      system.on('breakageDetected', (data) => {
        expect(data.toolId).toBe('tool-001');
        done();
      });
      system.detectBreakage('tool-001', {
        acousticPeak: 85,
        vibrationAmplitude: 2.0,
        cuttingForce: 5000,
      });
    });

    test('should deactivate tool on breakage', () => {
      system.detectBreakage('tool-001', {
        acousticPeak: 85,
        vibrationAmplitude: 2.0,
        cuttingForce: 5000,
      });
      const tool = system.tools.get('tool-001');
      expect(tool.active).toBe(false);
    });
  });

  // ===== Runout Monitoring Tests =====
  describe('Runout Monitoring', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
      });
    });

    test('should monitor runout', () => {
      const result = system.monitorRunout('tool-001', 0.02);
      expect(result).not.toBeNull();
      expect(result.tirValue).toBe(0.02);
      expect(result.type).toBe('runout');
    });

    test('should detect normal runout', () => {
      const result = system.monitorRunout('tool-001', 0.01);
      expect(result.status).toBe('good');
    });

    test('should detect warning runout', () => {
      const result = system.monitorRunout('tool-001', 0.06);
      expect(result.status).toBe('warning');
    });

    test('should detect critical runout', () => {
      const result = system.monitorRunout('tool-001', 0.15);
      expect(result.status).toBe('critical');
    });

    test('should emit runout warning event', (done) => {
      system.on('runoutWarning', (data) => {
        expect(data.toolId).toBe('tool-001');
        expect(data.status).not.toBe('good');
        done();
      });
      system.monitorRunout('tool-001', 0.08);
    });
  });

  // ===== Wear Rate Calculation Tests =====
  describe('Wear Rate Calculation', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
      });
    });

    test('should calculate wear rate', () => {
      system.recordFlankWear('tool-001', 0.1);
      setTimeout(() => {
        system.recordFlankWear('tool-001', 0.2);
      }, 100);

      // Wait a bit and calculate
      setTimeout(() => {
        const rate = system.calculateWearRate('tool-001', 0.1);
        expect(rate).toBeDefined();
      }, 200);
    });

    test('should return zero for insufficient data', () => {
      const rate = system.calculateWearRate('tool-001');
      expect(rate).toBe(0);
    });

    test('should return zero for single measurement', () => {
      system.recordFlankWear('tool-001', 0.1);
      const rate = system.calculateWearRate('tool-001');
      expect(rate).toBe(0);
    });
  });

  // ===== Life Prediction Tests =====
  describe('Tool Life Prediction', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
        expectedLife: 50,
      });
    });

    test('should predict remaining life', () => {
      const prediction = system.predictRemainingLife('tool-001');
      expect(prediction).not.toBeNull();
      expect(prediction.toolId).toBe('tool-001');
    });

    test('should return expected cycles when no wear', () => {
      const prediction = system.predictRemainingLife('tool-001');
      expect(prediction.remainingCycles).toBe(50);
    });

    test('should predict failure date with wear rate', () => {
      system.recordFlankWear('tool-001', 0.05);
      system.recordFlankWear('tool-001', 0.06);

      const prediction = system.predictRemainingLife('tool-001');
      expect(prediction.predictedFailure).toBeDefined();
    });
  });

  // ===== Tool Replacement Tests =====
  describe('Tool Replacement', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
      });
    });

    test('should replace tool', () => {
      const result = system.replaceTool('tool-001');
      expect(result).toBe(true);
    });

    test('should deactivate tool on replacement', () => {
      system.replaceTool('tool-001');
      const tool = system.tools.get('tool-001');
      expect(tool.active).toBe(false);
    });

    test('should emit tool replaced event', (done) => {
      system.on('toolReplaced', (data) => {
        expect(data.toolId).toBe('tool-001');
        expect(data.replacementTime).toBeDefined();
        done();
      });
      system.replaceTool('tool-001');
    });

    test('should increment tools replaced stat', () => {
      system.replaceTool('tool-001');
      const stats = system.getStatistics();
      expect(stats.toolsReplaced).toBe(1);
    });

    test('should throw on non-existent tool', () => {
      expect(() => system.replaceTool('non-existent')).toThrow();
    });
  });

  // ===== Tool Status Tests =====
  describe('Tool Status', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
        expectedLife: 50,
      });
    });

    test('should get tool status', () => {
      const status = system.getToolStatus('tool-001');
      expect(status.id).toBe('tool-001');
      expect(status.active).toBe(true);
      expect(status.type).toBe('end_mill');
    });

    test('should include wear rate in status', () => {
      system.recordFlankWear('tool-001', 0.1);
      const status = system.getToolStatus('tool-001');
      expect(status.wearRate).toBeDefined();
    });

    test('should include prediction in status', () => {
      const status = system.getToolStatus('tool-001');
      expect(status.remainingCycles).toBeDefined();
      expect(status.remainingMinutes).toBeDefined();
    });

    test('should throw on non-existent tool', () => {
      expect(() => system.getToolStatus('non-existent')).toThrow();
    });
  });

  // ===== Tool List Tests =====
  describe('Get Tools', () => {
    test('should return all tools', () => {
      system.registerTool('tool-001', { type: 'end_mill' });
      system.registerTool('tool-002', {
        type: 'ball_nose',
      });

      const tools = system.getTools();
      expect(tools.length).toBe(2);
      expect(tools[0].id).toBe('tool-001');
      expect(tools[1].id).toBe('tool-002');
    });

    test('should include tool properties', () => {
      system.registerTool('tool-001', {
        type: 'end_mill',
        material: 'HSS',
      });

      const tools = system.getTools();
      expect(tools[0].material).toBe('HSS');
      expect(tools[0].type).toBe('end_mill');
    });
  });

  // ===== System Statistics Tests =====
  describe('System Statistics', () => {
    test('should provide statistics', () => {
      system.registerTool('tool-001', { type: 'end_mill' });

      const stats = system.getStatistics();
      expect(stats.toolsMonitored).toBe(1);
      expect(stats.breakagesDetected).toBe(0);
      expect(stats.toolsReplaced).toBe(0);
    });

    test('should track breakages in statistics', () => {
      system.registerTool('tool-001', { type: 'end_mill' });
      system.detectBreakage('tool-001', {
        acousticPeak: 85,
        vibrationAmplitude: 2.0,
        cuttingForce: 5000,
      });

      const stats = system.getStatistics();
      expect(stats.breakagesDetected).toBe(1);
    });

    test('should track active tools', () => {
      system.registerTool('tool-001', { type: 'end_mill' });
      system.registerTool('tool-002', {
        type: 'ball_nose',
      });
      system.replaceTool('tool-001');

      const stats = system.getStatistics();
      expect(stats.activeTool).toBe(1);
    });
  });

  // ===== Tool Configuration Tests =====
  describe('Tool Configuration', () => {
    test('should store tool geometry', () => {
      system.registerTool('tool-001', {
        type: 'end_mill',
        toolGeometry: '4_flute',
      });

      const tool = system.tools.get('tool-001');
      expect(tool.toolGeometry).toBe('4_flute');
    });

    test('should store coating type', () => {
      system.registerTool('tool-001', {
        type: 'end_mill',
        coatingType: 'TiN',
      });

      const tool = system.tools.get('tool-001');
      expect(tool.coatingType).toBe('TiN');
    });

    test('should store insert number', () => {
      system.registerTool('tool-001', {
        type: 'end_mill',
        insertNumber: 3,
      });

      const tool = system.tools.get('tool-001');
      expect(tool.insertNumber).toBe(3);
    });

    test('should store diameter', () => {
      system.registerTool('tool-001', {
        type: 'end_mill',
        diameter: 8,
      });

      const tool = system.tools.get('tool-001');
      expect(tool.diameter).toBe(8);
    });
  });

  // ===== Wear Data History Tests =====
  describe('Wear Data History', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
      });
    });

    test('should maintain wear history', () => {
      system.recordFlankWear('tool-001', 0.1);
      system.recordFlankWear('tool-001', 0.15);
      system.recordFlankWear('tool-001', 0.2);

      const history = system.wearData.get('tool-001');
      expect(history.length).toBe(3);
    });

    test('should track wear measurements chronologically', () => {
      system.recordFlankWear('tool-001', 0.1);
      system.recordFlankWear('tool-001', 0.15);
      system.recordFlankWear('tool-001', 0.2);

      const history = system.wearData.get('tool-001');
      expect(history[0].vbbValue).toBe(0.1);
      expect(history[2].vbbValue).toBe(0.2);
    });
  });

  // ===== Last Measurement Tests =====
  describe('Last Measurement', () => {
    beforeEach(() => {
      system.registerTool('tool-001', {
        type: 'end_mill',
      });
    });

    test('should update last measurement on flank wear', () => {
      system.recordFlankWear('tool-001', 0.1);
      const tool = system.tools.get('tool-001');
      expect(tool.lastMeasurement).not.toBeNull();
      expect(tool.lastMeasurement.vbbValue).toBe(0.1);
    });

    test('should update last measurement on crater wear', () => {
      system.recordCraterWear('tool-001', 0.05);
      const tool = system.tools.get('tool-001');
      expect(tool.lastMeasurement).not.toBeNull();
      expect(tool.lastMeasurement.vbcValue).toBe(0.05);
    });

    test('should update last measurement on runout', () => {
      system.monitorRunout('tool-001', 0.02);
      const tool = system.tools.get('tool-001');
      expect(tool.lastMeasurement).toBeDefined();
      expect(tool.lastMeasurement.tirValue).toBe(0.02);
    });
  });
});
