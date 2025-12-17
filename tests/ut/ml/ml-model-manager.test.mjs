/**
 * ML Model Manager - Unit Tests
 * Phase 18: AI & Machine Learning
 */

import MLModelManager from '../../../modules/ml/ml-model-manager.mjs';

describe('MLModelManager', () => {
  let manager;

  beforeEach(() => {
    manager = new MLModelManager();
  });

  describe('Model Registration', () => {
    test('should register a new model', () => {
      const model = manager.registerModel({
        modelId: 'test_model_1',
        modelType: 'NEURAL_NET',
        version: '1.0.0',
      });

      expect(model.modelId).toBe('test_model_1');
      expect(model.status).toBe('READY');
      expect(model.modelType).toBe('NEURAL_NET');
    });

    test('should throw error without modelId', () => {
      expect(() => {
        manager.registerModel({ modelType: 'NEURAL_NET' });
      }).toThrow('Model registration requires modelId and modelType');
    });

    test('should throw error when max models reached', () => {
      const mgr = new MLModelManager({ maxModels: 1 });
      mgr.registerModel({ modelId: 'model_1', modelType: 'LINEAR_REGRESSION' });

      expect(() => {
        mgr.registerModel({ modelId: 'model_2', modelType: 'LINEAR_REGRESSION' });
      }).toThrow('Maximum models reached');
    });
  });

  describe('Training Data', () => {
    test('should load training data', () => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      const result = manager.loadTrainingData({
        modelId: 'test_model',
        data: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      });

      expect(result.totalSamples).toBe(3);
      expect(result.trainingSamples).toBe(2);
      expect(result.testSamples).toBe(1);
    });

    test('should throw error for invalid data', () => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      expect(() => {
        manager.loadTrainingData({
          modelId: 'test_model',
          data: [],
        });
      }).toThrow('Training data must be a non-empty array');
    });
  });

  describe('Model Training', () => {
    test('should train model successfully', () => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      manager.loadTrainingData({
        modelId: 'test_model',
        data: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      });

      const result = manager.trainModel({
        modelId: 'test_model',
        epochs: 10,
        learningRate: 0.01,
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.epochs).toBe(10);
      expect(result.losses.length).toBe(10);
    });

    test('should throw error when no training data', () => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      expect(() => {
        manager.trainModel({ modelId: 'test_model' });
      }).toThrow('No training data for model');
    });
  });

  describe('Inference', () => {
    test('should run inference', () => {
      const model = manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      const result = manager.inference({
        modelId: 'test_model',
        input: [1, 2, 3],
      });

      expect(result.modelId).toBe('test_model');
      expect(typeof result.output).toBe('number');
      expect(result.latencyMs).toBeGreaterThan(0);
    });

    test('should throw error for invalid input', () => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      expect(() => {
        manager.inference({
          modelId: 'test_model',
          input: 'not_array',
        });
      }).toThrow('Input must be an array');
    });

    test('should run batch inference', () => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      const results = manager.batchInference({
        modelId: 'test_model',
        inputs: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      });

      expect(results.length).toBe(3);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('Model Persistence', () => {
    test('should save model', () => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      const result = manager.saveModel({ modelId: 'test_model' });

      expect(result.modelId).toBe('test_model');
      expect(result.size).toBeGreaterThan(0);
    });

    test('should load model', () => {
      const result = manager.loadModel({
        modelId: 'loaded_model',
        path: '/models/test.json',
      });

      expect(result.status).toBe('LOADED');
      expect(result.modelId).toBe('loaded_model');
    });
  });

  describe('Model Metrics', () => {
    test('should get model metrics', () => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      manager.inference({
        modelId: 'test_model',
        input: [1, 2],
      });

      const metrics = manager.getModelMetrics({ modelId: 'test_model' });

      expect(metrics.modelId).toBe('test_model');
      expect(metrics.status).toBe('READY');
      expect(metrics.inferenceStats.totalInferences).toBe(1);
    });
  });

  describe('Model Listing', () => {
    test('should list all models', () => {
      manager.registerModel({
        modelId: 'model_1',
        modelType: 'NEURAL_NET',
      });

      manager.registerModel({
        modelId: 'model_2',
        modelType: 'LINEAR_REGRESSION',
      });

      const list = manager.listModels();

      expect(list.totalModels).toBe(2);
      expect(list.models.length).toBe(2);
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics', () => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      manager.inference({
        modelId: 'test_model',
        input: [1, 2],
      });

      const stats = manager.getStatistics();

      expect(stats.totalModels).toBe(1);
      expect(stats.totalInferences).toBe(1);
      expect(stats.successfulInferences).toBe(1);
    });
  });

  describe('Event Emission', () => {
    test('should emit model:registered event', (done) => {
      manager.on('model:registered', (model) => {
        expect(model.modelId).toBe('test_model');
        done();
      });

      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });
    });

    test('should emit inference:completed event', (done) => {
      manager.registerModel({
        modelId: 'test_model',
        modelType: 'NEURAL_NET',
      });

      manager.on('inference:completed', (data) => {
        expect(data.modelId).toBe('test_model');
        done();
      });

      manager.inference({
        modelId: 'test_model',
        input: [1, 2],
      });
    });
  });
});
