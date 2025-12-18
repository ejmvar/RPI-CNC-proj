import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';

describe('ModelRegistry (full)', () => {
  test('registers a model version and retrieves it', () => {
    const r = new ModelRegistry();
    const v = r.register('mod1', { versionId: 'v1', meta: { version: '1.0' } });
    expect(v.versionId).toBe('v1');

    const model = r.getModel('mod1');
    expect(model.id).toBe('mod1');
    expect(model.versions.length).toBe(1);
    expect(model.versions[0].meta.version).toBe('1.0');
    expect(r.listModels()).toContain('mod1');
  });

  test('registers artifact and validates checksum', () => {
    const r = new ModelRegistry();
    const artifact = Buffer.from('artifact-bytes');
    r.register('mod2', { versionId: 'v1', meta: { note: 'with artifact' }, artifact });

    const model = r.getModel('mod2');
    expect(model.versions[0].artifactHash).toMatch(/^sha256:/);
    expect(model.versions[0].artifactSize).toBe(artifact.length);

    // validate with correct artifact
    expect(r.validateVersion('mod2', 'v1', artifact)).toBe(true);

    // validate with different artifact
    expect(r.validateVersion('mod2', 'v1', Buffer.from('other'))).toBe(false);
  });

  test('duplicate version registration throws', () => {
    const r = new ModelRegistry();
    r.register('mod3', { versionId: 'v1', meta: {} });
    expect(() => r.register('mod3', { versionId: 'v1', meta: {} })).toThrow();
  });

  test('promote version updates status and emits event', () => {
    const r = new ModelRegistry();
    r.register('mod4', { versionId: 'v1', meta: {} });
    const events = [];
    r.on('modelPromoted', (d) => events.push(d));

    expect(r.promoteVersion('mod4', 'v1', 'prod')).toBe(true);
    const model = r.getModel('mod4');
    expect(model.versions[0].status).toBe('prod');
    expect(events.length).toBe(1);
    expect(events[0].target).toBe('prod');
  });

  test('deleteModel removes model and emits event', () => {
    const r = new ModelRegistry();
    r.register('mod5', { versionId: 'v1', meta: {} });
    const events = [];
    r.on('modelDeleted', (d) => events.push(d));

    expect(r.deleteModel('mod5')).toBe(true);
    expect(r.getModel('mod5')).toBeNull();
    expect(events.length).toBe(1);
  });

  test('errors on invalid operations', () => {
    const r = new ModelRegistry();
    expect(() => r.register(null, {})).toThrow();
    expect(() => r.promoteVersion('no', 'v', 'prod')).toThrow();
    expect(() => r.validateVersion('no', 'v', Buffer.from('a'))).toThrow();
  });
});
