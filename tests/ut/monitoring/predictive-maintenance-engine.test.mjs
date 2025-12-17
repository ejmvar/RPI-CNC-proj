import { PredictiveMaintenanceEngine } from '../../../modules/monitoring/predictive-maintenance-engine.mjs';

describe('PredictiveMaintenanceEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PredictiveMaintenanceEngine({
      wearThresholdWarning: 0.7,
      wearThresholdCritical: 0.9,
      healthScoreThreshold: 0.5,
    });
  });

  test('should initialize with default options', () => {
    const stats = engine.getStatistics();
    expect(stats.registeredEquipment).toBe(0);
    expect(stats.totalPredictions).toBe(0);
  });

  test('should register equipment', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      material: 'HSS',
    });

    let equipmentRegistered = false;
    engine.on('equipmentRegistered', () => {
      equipmentRegistered = true;
    });

    expect(engine.getStatistics().registeredEquipment).toBeGreaterThan(0);
  });

  test('should emit equipment registered event', (done) => {
    let eventEmitted = false;
    engine.on('equipmentRegistered', () => {
      eventEmitted = true;
    });

    engine.registerEquipment('tool_2', { type: 'endmill', maxLifeHours: 100 });

    setTimeout(() => {
      expect(eventEmitted).toBe(true);
      done();
    }, 50);
  });

  test('should predict tool wear', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 50,
      wearRate: 0.01,
    });

    const prediction = engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    expect(prediction.wearPercentage).toBeDefined();
    expect(prediction.estimatedHoursRemaining).toBeDefined();
    expect(prediction.severity).toBeDefined();
  });

  test('should return NORMAL severity for low wear', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 10,
      wearRate: 0.001,
    });

    const prediction = engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    expect(prediction.severity).toBe('NORMAL');
  });

  test('should return WARNING severity for medium wear', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 75,
      wearRate: 0.01,
    });

    const prediction = engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    expect(prediction.severity).toBe('WARNING');
  });

  test('should return CRITICAL severity for high wear', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 95,
      wearRate: 0.01,
    });

    const prediction = engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    expect(prediction.severity).toBe('CRITICAL');
  });

  test('should calculate health score', () => {
    engine.registerEquipment('spindle_1', {
      type: 'spindle',
      maxLifeHours: 1000,
      operatingHours: 200,
    });

    const healthScore = engine.calculateHealthScore('spindle_1', {
      vibration: 2,
      temperature: 30,
      efficiency: 95,
    });

    expect(healthScore.score).toBeDefined();
    expect(healthScore.score).toBeGreaterThan(0);
    expect(healthScore.score).toBeLessThanOrEqual(1);
  });

  test('should emit health score calculated event', (done) => {
    let eventEmitted = false;
    engine.on('healthScoreCalculated', () => {
      eventEmitted = true;
    });

    engine.registerEquipment('spindle_1', {
      type: 'spindle',
      maxLifeHours: 1000,
      operatingHours: 200,
    });

    engine.calculateHealthScore('spindle_1', {
      vibration: 2,
      temperature: 30,
      efficiency: 95,
    });

    setTimeout(() => {
      expect(eventEmitted).toBe(true);
      done();
    }, 50);
  });

  test('should generate maintenance recommendations for critical wear', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 98,
      wearRate: 0.01,
    });

    const prediction = engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    const healthScore = engine.calculateHealthScore('tool_1', {
      vibration: 1,
      temperature: 25,
      efficiency: 100,
    });

    const recommendations = engine.generateRecommendations('tool_1', prediction, healthScore);

    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  test('should emit recommendations generated event', (done) => {
    let eventEmitted = false;
    engine.on('recommendationsGenerated', () => {
      eventEmitted = true;
    });

    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 95,
      wearRate: 0.01,
    });

    const prediction = engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    const healthScore = engine.calculateHealthScore('tool_1', {
      vibration: 1,
      temperature: 25,
      efficiency: 100,
    });

    engine.generateRecommendations('tool_1', prediction, healthScore);

    setTimeout(() => {
      expect(eventEmitted).toBe(true);
      done();
    }, 50);
  });

  test('should detect excessive vibration anomaly', (done) => {
    let anomalyDetected = false;
    engine.on('anomaliesDetected', () => {
      anomalyDetected = true;
    });

    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      vibrationThreshold: 5,
    });

    engine.detectAnomalies('tool_1', {
      vibration: 8, // exceeds threshold
      temperature: 25,
      feedRateStability: 100,
      spindleRunout: 0.01,
    });

    setTimeout(() => {
      expect(anomalyDetected).toBe(true);
      done();
    }, 50);
  });

  test('should detect high temperature anomaly', (done) => {
    let anomalyDetected = false;
    engine.on('anomaliesDetected', (data) => {
      anomalyDetected = data.anomalies.some((a) => a.type === 'HIGH_TEMPERATURE');
    });

    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
    });

    engine.detectAnomalies('tool_1', {
      vibration: 1,
      temperature: 65, // high temperature
      feedRateStability: 100,
      spindleRunout: 0.01,
    });

    setTimeout(() => {
      expect(anomalyDetected).toBe(true);
      done();
    }, 50);
  });

  test('should detect spindle runout anomaly', (done) => {
    let anomalyDetected = false;
    engine.on('anomaliesDetected', (data) => {
      anomalyDetected = data.anomalies.some((a) => a.type === 'SPINDLE_RUNOUT');
    });

    engine.registerEquipment('spindle_1', {
      type: 'spindle',
      maxLifeHours: 1000,
    });

    engine.detectAnomalies('spindle_1', {
      vibration: 1,
      temperature: 30,
      feedRateStability: 95,
      spindleRunout: 0.1, // exceeds threshold
    });

    setTimeout(() => {
      expect(anomalyDetected).toBe(true);
      done();
    }, 50);
  });

  test('should get maintenance history', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      lastMaintenanceDate: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    });

    const history = engine.getMaintenanceHistory('tool_1');
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
  });

  test('should get predictions', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 50,
      wearRate: 0.01,
    });

    engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    const predictions = engine.getPredictions('tool_1');
    expect(Array.isArray(predictions)).toBe(true);
    expect(predictions.length).toBeGreaterThan(0);
  });

  test('should get recommendations', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 95,
      wearRate: 0.01,
    });

    const prediction = engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    const healthScore = engine.calculateHealthScore('tool_1', {
      vibration: 1,
      temperature: 25,
      efficiency: 100,
    });

    engine.generateRecommendations('tool_1', prediction, healthScore);
    const recommendations = engine.getRecommendations('tool_1');

    expect(Array.isArray(recommendations)).toBe(true);
  });

  test('should get health score', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 50,
    });

    engine.calculateHealthScore('tool_1', {
      vibration: 1,
      temperature: 25,
      efficiency: 95,
    });

    const healthScore = engine.getHealthScore('tool_1');
    expect(healthScore).not.toBeNull();
    expect(healthScore.score).toBeDefined();
  });

  test('should get statistics', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 50,
      wearRate: 0.01,
    });

    engine.registerEquipment('tool_2', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 50,
      wearRate: 0.01,
    });

    engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    const stats = engine.getStatistics();
    expect(stats.registeredEquipment).toBe(2);
    expect(stats.totalPredictions).toBeGreaterThan(0);
  });

  test('should calculate average health score', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 50,
    });

    engine.calculateHealthScore('tool_1', {
      vibration: 1,
      temperature: 25,
      efficiency: 95,
    });

    const stats = engine.getStatistics();
    expect(stats.averageHealthScore).toBeGreaterThan(0);
    expect(stats.averageHealthScore).toBeLessThanOrEqual(1);
  });

  test('should account for temperature in wear calculation', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 50,
      wearRate: 0.01,
      temperatureSensitivity: 0.5,
    });

    const coolPrediction = engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 20,
      vibration: 0,
    });

    const hotPrediction = engine.predictWear('tool_1', {
      feedRate: 100,
      spindleSpeed: 1000,
      temperature: 60,
      vibration: 0,
    });

    // Higher temperature should lead to higher wear
    expect(hotPrediction.wearPercentage).toBeGreaterThanOrEqual(coolPrediction.wearPercentage);
  });

  test('should account for feed rate in wear calculation', () => {
    engine.registerEquipment('tool_1', {
      type: 'endmill',
      maxLifeHours: 100,
      operatingHours: 50,
      wearRate: 0.01,
    });

    const slowFeedPrediction = engine.predictWear('tool_1', {
      feedRate: 50,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    const fastFeedPrediction = engine.predictWear('tool_1', {
      feedRate: 200,
      spindleSpeed: 1000,
      temperature: 25,
      vibration: 0,
    });

    // Higher feed rate should lead to higher wear
    expect(fastFeedPrediction.wearPercentage).toBeGreaterThanOrEqual(
      slowFeedPrediction.wearPercentage
    );
  });
});
