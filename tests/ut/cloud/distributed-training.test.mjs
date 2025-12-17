import { DistributedTrainingManager } from '../../../modules/cloud/distributed-training.mjs';

describe('DistributedTrainingManager (scaffold)', () => {
  test('class exists and can register a model', () => {
    const m = new DistributedTrainingManager();
    expect(typeof m.registerModel).toBe('function');
    expect(m.registerModel({ id: 'model-1' })).toBe(true);
  });

  test('start/stop training basic flow', () => {
    const m = new DistributedTrainingManager();
    const res = m.startTraining('job-1', { epochs: 1 });
    expect(res.status).toBe('running');
    expect(m.stopTraining('job-1')).toBe(true);
  });
});
