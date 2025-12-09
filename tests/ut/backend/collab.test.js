const { createCollabServer } = require('../../../modules/backend/collab/index.js');

describe('collab server', () => {
  test('create, join and update session flow', () => {
    const s = createCollabServer();
    const session = s.createSession('sess1', { foo: 'bar' });
    expect(session.id).toBe('sess1');

    const afterJoin = s.joinSession('sess1', 'clientA');
    expect(afterJoin.clients).toContain('clientA');

    const updated = s.updateSession('sess1', { foo: 'baz' });
    expect(updated.foo).toBe('baz');
  });
});
