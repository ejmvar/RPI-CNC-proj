import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';

describe('ModelRegistry (scaffold)', () => {
  test('register and retrieve model', () => {
    const r = new ModelRegistry();
    expect(r.register('mod1', { version: '1.0' })).toBe(true);
    expect(r.getModel('mod1').meta.version).toBe('1.0');
    expect(r.listModels()).toContain('mod1');
  });
});
