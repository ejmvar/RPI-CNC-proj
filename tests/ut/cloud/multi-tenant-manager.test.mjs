import { MultiTenantManager } from '../../../modules/cloud/multi-tenant-manager.mjs';

describe('MultiTenantManager (scaffold)', () => {
  test('register and list tenants', () => {
    const t = new MultiTenantManager();
    expect(t.registerTenant('tenant-1')).toBe(true);
    expect(t.listTenants()).toContain('tenant-1');
    expect(t.getTenant('tenant-1').id).toBe('tenant-1');
  });
});
