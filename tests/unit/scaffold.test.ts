import { describe, it, expect } from 'vitest';

describe('scaffold', () => {
  it('project is initialized', () => {
    expect(true).toBe(true);
  });

  it('package name is correct', async () => {
    const pkg = await import('../../package.json', { assert: { type: 'json' } });
    expect(pkg.default.name).toBe('candidate-skill-scanner');
  });
});
