/**
 * Tool Selector - Unit Tests
 * Phase 18: AI & Machine Learning
 */

import ToolSelector from '../../../modules/ml/tool-selector.mjs';

describe('ToolSelector', () => {
  let selector;

  beforeEach(() => {
    selector = new ToolSelector();
  });

  describe('Tool Selection', () => {
    test('should select tools for operation', () => {
      const selection = selector.selectTools({
        material: 'aluminum',
        operation: 'MILLING',
      });

      expect(selection.recommendations.length).toBeGreaterThan(0);
      expect(selection.recommendations[0].rank).toBe(1);
    });

    test('should provide primary and alternative tools', () => {
      const selection = selector.selectTools({
        material: 'steel',
        operation: 'DRILLING',
      });

      expect(selection.recommendations[0].recommendation).toBe('PRIMARY');
      expect(selection.recommendations.length >= 1).toBe(true);
    });

    test('should throw error without required params', () => {
      expect(() => {
        selector.selectTools({ material: 'aluminum' });
      }).toThrow('Tool selection requires material and operation');
    });

    test('should estimate tool life', () => {
      const selection = selector.selectTools({
        material: 'aluminum',
        operation: 'MILLING',
      });

      expect(selection.recommendations[0].estimatedLifetime).toBeGreaterThan(0);
    });
  });

  describe('Tool Analysis', () => {
    test('should analyze tool performance', () => {
      selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 100,
        material: 'aluminum',
        operation: 'MILLING',
      });

      const analysis = selector.analyzeTool({ toolId: 'em_3_flute' });

      expect(analysis.toolId).toBe('em_3_flute');
      expect(analysis.usageCount).toBeGreaterThan(0);
    });

    test('should throw error for nonexistent tool', () => {
      expect(() => {
        selector.analyzeTool({ toolId: 'nonexistent' });
      }).toThrow('Tool not found');
    });

    test('should provide tool recommendations', () => {
      selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 500,
        material: 'aluminum',
        operation: 'MILLING',
      });

      const analysis = selector.analyzeTool({ toolId: 'em_3_flute' });

      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe('Failure Prediction', () => {
    test('should predict tool failure', () => {
      selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 100,
        material: 'aluminum',
      });

      const prediction = selector.predictFailure({ toolId: 'em_3_flute' });

      expect(prediction.failureProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.failureProbability).toBeLessThanOrEqual(100);
    });

    test('should classify risk levels', () => {
      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 95 });

      const prediction = selector.predictFailure({ toolId: 'em_3_flute' });

      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(prediction.riskLevel);
    });

    test('should provide failure recommendation', () => {
      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 90 });

      const prediction = selector.predictFailure({ toolId: 'em_3_flute' });

      expect(prediction.recommendation).toBeDefined();
      expect(typeof prediction.recommendation).toBe('string');
    });
  });

  describe('Usage Recording', () => {
    test('should record tool usage', () => {
      const result = selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 100,
        material: 'aluminum',
        operation: 'MILLING',
      });

      expect(result.status).toBe('RECORDED');
      expect(result.toolId).toBe('em_3_flute');
    });

    test('should record multiple usage records', () => {
      selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 100,
        material: 'aluminum',
      });

      selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 50,
        material: 'aluminum',
      });

      const stats = selector.getStatistics();

      expect(stats.toolsInUse).toBeGreaterThan(0);
    });
  });

  describe('Wear Measurement', () => {
    test('should record tool wear', () => {
      const result = selector.recordWear({
        toolId: 'em_3_flute',
        wearPercent: 25,
      });

      expect(result.status).toBe('RECORDED');
      expect(result.wearPercent).toBe(25);
    });

    test('should track wear progression', () => {
      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 10 });
      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 20 });
      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 35 });

      const analysis = selector.analyzeTool({ toolId: 'em_3_flute' });

      expect(analysis.averageWear).toBeGreaterThan(0);
    });
  });

  describe('Inventory Management', () => {
    test('should get inventory recommendations', () => {
      selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 100,
        material: 'aluminum',
      });

      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 30 });

      const recommendations = selector.getInventoryRecommendations();

      expect(recommendations.recommendations).toBeDefined();
      expect(Array.isArray(recommendations.recommendations)).toBe(true);
    });

    test('should filter recommendations by material', () => {
      selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 100,
        material: 'aluminum',
      });

      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 30 });

      const recommendations = selector.getInventoryRecommendations({
        material: 'aluminum',
      });

      expect(recommendations.recommendations).toBeDefined();
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics', () => {
      selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 100,
        material: 'aluminum',
      });

      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 25 });

      const stats = selector.getStatistics();

      expect(stats.totalTools).toBeGreaterThan(0);
      expect(stats.totalUsageRecords).toBe(1);
      expect(stats.totalWearMeasurements).toBe(1);
    });

    test('should track average wear', () => {
      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 20 });
      selector.recordWear({ toolId: 'em_3_flute', wearPercent: 30 });

      const stats = selector.getStatistics();

      expect(stats.averageWear).toBeGreaterThan(0);
      expect(stats.averageWear).toBeLessThanOrEqual(100);
    });
  });

  describe('Event Emission', () => {
    test('should emit tools:selected event', (done) => {
      selector.on('tools:selected', (data) => {
        expect(data.material).toBe('aluminum');
        done();
      });

      selector.selectTools({
        material: 'aluminum',
        operation: 'MILLING',
      });
    });

    test('should emit usage:recorded event', (done) => {
      selector.on('usage:recorded', (data) => {
        expect(data.toolId).toBe('em_3_flute');
        done();
      });

      selector.recordUsage({
        toolId: 'em_3_flute',
        duration: 100,
        material: 'aluminum',
      });
    });
  });
});
