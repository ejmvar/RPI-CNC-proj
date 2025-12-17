/**
 * Advanced Simulation & Analysis Tests
 * Phase 16: Advanced Simulation & Analysis
 */

/* eslint-disable no-undef */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CollisionDetector } from '../../../modules/simulation/collision-detector.mjs';
import { ThermalAnalyzer } from '../../../modules/simulation/thermal-analyzer.mjs';
import { ChipLoadOptimizer } from '../../../modules/simulation/chip-load-optimizer.mjs';
import { ToolWearPredictor } from '../../../modules/simulation/tool-wear-predictor.mjs';

describe('CollisionDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new CollisionDetector({
      minX: 0,
      maxX: 100,
      minY: 0,
      maxY: 100,
      minZ: 0,
      maxZ: 50,
    });
  });

  test('should create collision detector', () => {
    expect(detector).toBeDefined();
    expect(detector.workArea.maxX).toBe(100);
  });

  test('should add tool', () => {
    const tool = { id: '1', name: 'Tool 1', diameter: 3.175 };
    const result = detector.addTool(tool);
    expect(result.added).toBe(true);
    expect(detector.tools.length).toBe(1);
  });

  test('should add fixture', () => {
    const fixture = {
      id: 'fix1',
      name: 'Fixture 1',
      minX: 0,
      maxX: 50,
      minY: 0,
      maxY: 50,
      minZ: 0,
      maxZ: 10,
    };
    const result = detector.addFixture(fixture);
    expect(result.added).toBe(true);
    expect(detector.fixtures.length).toBe(1);
  });

  test('should detect boundary collision', () => {
    detector.addTool({ id: '1', diameter: 3.175 });
    // Position outside default bounds (minX: -250): -300 should trigger collision
    const result = detector.checkCollision('1', { x: -300, y: 50, z: 25 });
    expect(result.hasCollision).toBe(true);
  });

  test('should detect safe position', () => {
    detector.addTool({ id: '1', diameter: 3.175 });
    const result = detector.checkCollision('1', { x: 50, y: 50, z: 25 });
    expect(result.hasCollision).toBe(false);
  });

  test('should detect fixture collision', () => {
    detector.addTool({ id: '1', diameter: 3.175 });
    detector.addFixture({ id: 'fix1', minX: 10, maxX: 30, minY: 10, maxY: 30, minZ: 0, maxZ: 10 });
    const result = detector.checkCollision('1', { x: 20, y: 20, z: 5 });
    expect(result.hasCollision).toBe(true);
  });

  test('should validate toolpath for collisions', () => {
    detector.addTool({ id: '1', diameter: 3.175 });
    const toolpath = [
      { x: 50, y: 50, z: 25 },
      { x: 60, y: 60, z: 25 },
      { x: 70, y: 70, z: 25 },
    ];
    const result = detector.validateToolpath('1', toolpath);
    expect(result.totalPoints).toBe(3);
  });

  test('should get statistics', () => {
    detector.addTool({ id: '1' });
    detector.addFixture({ id: 'fix1', minX: 0, maxX: 50 });
    const stats = detector.getStats();
    expect(stats.toolsTracked).toBe(1);
    expect(stats.fixturesTracked).toBe(1);
  });
});

describe('ThermalAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ThermalAnalyzer({ maxRPM: 24000, maxPower: 3000 });
  });

  test('should create thermal analyzer', () => {
    expect(analyzer).toBeDefined();
    expect(analyzer.options.maxPower).toBe(3000);
  });

  test('should calculate spindle load', () => {
    const tool = { diameter: 3.175, flutes: 2 };
    const result = analyzer.calculateSpindleLoad(tool, 150, 12000);
    expect(result.load).toBeDefined();
    expect(result.chipLoad).toBeDefined();
  });

  test('should estimate heat generation', () => {
    const tool = { diameter: 3.175, flutes: 2 };
    const result = analyzer.estimateHeatGeneration(tool, 150, 12000, 'aluminum');
    expect(result.heatGeneration).toBeGreaterThan(0);
  });

  test('should predict cutting temperature', () => {
    const tool = { diameter: 3.175 };
    const result = analyzer.predictCuttingTemp(tool, 150, 12000, 'aluminum', 60);
    expect(result.cuttingTemp).toBeGreaterThan(0);
    expect(result.isSafe).toBeDefined();
  });

  test('should analyze toolpath thermal stress', () => {
    const tool = { diameter: 3.175, flutes: 2 };
    const toolpath = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: -5 },
      { x: 20, y: 20, z: -5 },
    ];
    const result = analyzer.analyzeThermalStress(tool, toolpath, 150, 12000, 'aluminum');
    expect(result.maxTemperature).toBeDefined();
    expect(result.isSafe).toBeDefined();
  });

  test('should get thermal recommendations', () => {
    const recommendations = analyzer.getThermalRecommendations(150);
    expect(Array.isArray(recommendations)).toBe(true);
  });

  test('should get analyzer statistics', () => {
    const stats = analyzer.getStats();
    expect(stats.maxPower).toBe(3000);
  });
});

describe('ChipLoadOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new ChipLoadOptimizer();
  });

  test('should create chip load optimizer', () => {
    expect(optimizer).toBeDefined();
    expect(optimizer.options.materials).toBeDefined();
  });

  test('should calculate chip load', () => {
    const result = optimizer.calculateChipLoad(150, 12000, 2);
    expect(result.chipLoad).toBeDefined();
    expect(result.chipLoad).toBeCloseTo(0.00625, 4);
  });

  test('should recommend feed rate', () => {
    const result = optimizer.recommendFeedRate(0.1, 12000, 2);
    expect(result.recommendedFeedRate).toBe(2400);
  });

  test('should optimize for aluminum', () => {
    const result = optimizer.optimizeForMaterial('aluminum', 3.175, 2);
    expect(result.optimalChipLoad).toBeDefined();
    expect(result.optimalRPM).toBeGreaterThan(0);
    expect(result.optimalFeedRate).toBeGreaterThan(0);
  });

  test('should optimize for steel', () => {
    const result = optimizer.optimizeForMaterial('steel', 3.175, 2);
    expect(result.coolingRequired).toBe(true);
  });

  test('should validate chip load', () => {
    const result = optimizer.validateChipLoad(0.1, 'aluminum');
    expect(result.isValid).toBe(true);
  });

  test('should detect chip load too high', () => {
    const result = optimizer.validateChipLoad(0.35, 'aluminum');
    expect(result.isValid).toBe(false); // 0.35 exceeds aluminum max (0.3)
    expect(result.status).toBe('too-high');
  });

  test('should estimate tool life', () => {
    const result = optimizer.estimateToolLife(3.175, 'aluminum', 0.1, 30);
    expect(result.remainingLife).toBeDefined();
    expect(result.wearPercentage).toBeDefined();
  });
});

describe('ToolWearPredictor', () => {
  let predictor;

  beforeEach(() => {
    predictor = new ToolWearPredictor({ wearThreshold: 0.5 });
  });

  test('should create tool wear predictor', () => {
    expect(predictor).toBeDefined();
    expect(predictor.options.wearThreshold).toBe(0.5);
  });

  test('should register tool', () => {
    const result = predictor.registerTool('tool1', { name: 'Tool 1', diameter: 3.175 });
    expect(result.registered).toBe(true);
    expect(predictor.tools.size).toBe(1);
  });

  test('should calculate wear rate', () => {
    predictor.registerTool('tool1', { name: 'Tool 1', diameter: 3.175, flutes: 2 });
    const result = predictor.calculateWearRate('tool1', 150, 12000, 'aluminum');
    expect(result.wearRate).toBeDefined();
  });

  test('should update wear', () => {
    predictor.registerTool('tool1', { name: 'Tool 1' });
    const result = predictor.updateWear('tool1', 0.05, 10);
    expect(result.currentWear).toBe(0.05);
  });

  test('should get wear status', () => {
    predictor.registerTool('tool1', { name: 'Tool 1' });
    predictor.updateWear('tool1', 0.1);
    const status = predictor.getWearStatus('tool1');
    expect(status.isHealthy).toBe(true);
  });

  test('should predict remaining life', () => {
    predictor.registerTool('tool1', { name: 'Tool 1', diameter: 3.175, flutes: 2 });
    predictor.updateWear('tool1', 0.1);
    const result = predictor.predictRemainingLife('tool1', 150, 12000, 'aluminum');
    expect(result.remainingTime).toBeDefined();
  });

  test('should estimate maintenance schedule', () => {
    predictor.registerTool('tool1', { name: 'Tool 1' });
    predictor.registerTool('tool2', { name: 'Tool 2' });
    predictor.updateWear('tool1', 0.3);
    const result = predictor.estimateMaintenanceSchedule();
    expect(Array.isArray(result.schedule)).toBe(true);
  });

  test('should get wear history', () => {
    predictor.registerTool('tool1', { name: 'Tool 1' });
    predictor.updateWear('tool1', 0.05);
    predictor.updateWear('tool1', 0.1);
    const result = predictor.getWearHistory('tool1');
    expect(Array.isArray(result.history)).toBe(true);
  });

  test('should reset tool wear', () => {
    predictor.registerTool('tool1', { name: 'Tool 1' });
    predictor.updateWear('tool1', 0.2);
    const result = predictor.resetToolWear('tool1');
    expect(result.reset).toBe(true);

    const status = predictor.getWearStatus('tool1');
    expect(status.currentWear).toBe(0);
  });

  test('should get wear statistics', () => {
    predictor.registerTool('tool1', { name: 'Tool 1' });
    predictor.registerTool('tool2', { name: 'Tool 2' });
    predictor.updateWear('tool1', 0.1);
    predictor.updateWear('tool2', 0.2);

    const stats = predictor.getStats();
    expect(stats.totalTools).toBe(2);
    expect(stats.avgWear).toBeGreaterThan(0);
  });
});
