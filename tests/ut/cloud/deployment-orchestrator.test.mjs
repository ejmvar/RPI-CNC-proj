import { DeploymentOrchestrator } from '../../../modules/cloud/deployment-orchestrator.mjs';

describe('DeploymentOrchestrator (scaffold)', () => {
  test('create and start deployment', () => {
    const d = new DeploymentOrchestrator();
    const id = d.createDeployment('dep1', { env: 'staging' });
    expect(id).toBe('dep1');
    expect(d.startDeployment('dep1')).toBe(true);
    expect(d.getDeploymentStatus('dep1').status).toBe('running');
  });
});
