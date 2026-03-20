import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = resolve(__dirname, '../..');

function readJson(filename: string) {
  return JSON.parse(readFileSync(resolve(projectRoot, filename), 'utf-8'));
}

describe('US-002: TypeScript targets, Tailwind/Vite config, and Firebase emulator setup', () => {
  describe('tsconfig.json (base)', () => {
    it('has strict mode enabled', () => {
      const tsconfig = readJson('tsconfig.json');
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('has @/* path alias pointing to src/*', () => {
      const tsconfig = readJson('tsconfig.json');
      expect(tsconfig.compilerOptions.paths?.['@/*']).toContain('src/*');
    });
  });

  describe('tsconfig.app.json', () => {
    it('extends base tsconfig', () => {
      const tsconfig = readJson('tsconfig.app.json');
      expect(tsconfig.extends).toBe('./tsconfig.json');
    });

    it('includes DOM lib', () => {
      const tsconfig = readJson('tsconfig.app.json');
      expect(tsconfig.compilerOptions.lib).toContain('DOM');
    });

    it('includes ES2022 lib', () => {
      const tsconfig = readJson('tsconfig.app.json');
      expect(tsconfig.compilerOptions.lib).toContain('ES2022');
    });

    it('includes src/app in scope', () => {
      const tsconfig = readJson('tsconfig.app.json');
      expect(tsconfig.include.some((p: string) => p.startsWith('src/app'))).toBe(true);
    });

    it('includes src/types in scope', () => {
      const tsconfig = readJson('tsconfig.app.json');
      expect(tsconfig.include.some((p: string) => p.startsWith('src/types'))).toBe(true);
    });

    it('includes src/core in scope', () => {
      const tsconfig = readJson('tsconfig.app.json');
      expect(tsconfig.include.some((p: string) => p.startsWith('src/core'))).toBe(true);
    });
  });

  describe('tsconfig.pipeline.json', () => {
    it('extends base tsconfig', () => {
      const tsconfig = readJson('tsconfig.pipeline.json');
      expect(tsconfig.extends).toBe('./tsconfig.json');
    });

    it('does NOT include DOM lib', () => {
      const tsconfig = readJson('tsconfig.pipeline.json');
      const lib: string[] = tsconfig.compilerOptions.lib ?? [];
      expect(lib).not.toContain('DOM');
      expect(lib).not.toContain('DOM.Iterable');
    });

    it('includes node types', () => {
      const tsconfig = readJson('tsconfig.pipeline.json');
      expect(tsconfig.compilerOptions.types).toContain('node');
    });

    it('includes ES2022 lib', () => {
      const tsconfig = readJson('tsconfig.pipeline.json');
      expect(tsconfig.compilerOptions.lib).toContain('ES2022');
    });

    it('includes src/pipeline in scope', () => {
      const tsconfig = readJson('tsconfig.pipeline.json');
      expect(tsconfig.include.some((p: string) => p.startsWith('src/pipeline'))).toBe(true);
    });

    it('includes src/core in scope', () => {
      const tsconfig = readJson('tsconfig.pipeline.json');
      expect(tsconfig.include.some((p: string) => p.startsWith('src/core'))).toBe(true);
    });

    it('includes src/adapters in scope', () => {
      const tsconfig = readJson('tsconfig.pipeline.json');
      expect(tsconfig.include.some((p: string) => p.startsWith('src/adapters'))).toBe(true);
    });

    it('includes src/handlers in scope', () => {
      const tsconfig = readJson('tsconfig.pipeline.json');
      expect(tsconfig.include.some((p: string) => p.startsWith('src/handlers'))).toBe(true);
    });
  });

  describe('tsconfig.functions.json', () => {
    it('extends base tsconfig', () => {
      const tsconfig = readJson('tsconfig.functions.json');
      expect(tsconfig.extends).toBe('./tsconfig.json');
    });

    it('includes functions/src in scope', () => {
      const tsconfig = readJson('tsconfig.functions.json');
      expect(tsconfig.include.some((p: string) => p.startsWith('functions/src'))).toBe(true);
    });
  });

  describe('firebase.json', () => {
    it('has hosting config with SPA rewrite', () => {
      const config = readJson('firebase.json');
      expect(config.hosting).toBeDefined();
      expect(config.hosting.public).toBe('dist');
      const rewrite = config.hosting.rewrites.find(
        (r: { source: string; destination: string }) => r.source === '/**'
      );
      expect(rewrite?.destination).toBe('/index.html');
    });

    it('has functions config', () => {
      const config = readJson('firebase.json');
      expect(config.functions).toBeDefined();
    });

    it('has emulators config with auth and firestore', () => {
      const config = readJson('firebase.json');
      expect(config.emulators?.auth?.port).toBe(9099);
      expect(config.emulators?.firestore?.port).toBe(8080);
    });
  });

  describe('.firebaserc', () => {
    it('has projects.default alias', () => {
      const rc = readJson('.firebaserc');
      expect(rc.projects?.default).toBeDefined();
    });
  });

  describe('.env.example', () => {
    it('documents all VITE_FIREBASE_* vars', () => {
      const content = readFileSync(resolve(projectRoot, '.env.example'), 'utf-8');
      expect(content).toContain('VITE_FIREBASE_API_KEY');
      expect(content).toContain('VITE_FIREBASE_AUTH_DOMAIN');
      expect(content).toContain('VITE_FIREBASE_PROJECT_ID');
      expect(content).toContain('VITE_FIREBASE_STORAGE_BUCKET');
      expect(content).toContain('VITE_FIREBASE_MESSAGING_SENDER_ID');
      expect(content).toContain('VITE_FIREBASE_APP_ID');
    });

    it('documents GITHUB_PAT', () => {
      const content = readFileSync(resolve(projectRoot, '.env.example'), 'utf-8');
      expect(content).toContain('GITHUB_PAT');
    });
  });

  describe('.github/workflows/ci.yml', () => {
    it('ci workflow file exists', () => {
      const content = readFileSync(
        resolve(projectRoot, '.github/workflows/ci.yml'),
        'utf-8'
      );
      expect(content).toBeDefined();
    });

    it('workflow runs on push to any branch', () => {
      const content = readFileSync(
        resolve(projectRoot, '.github/workflows/ci.yml'),
        'utf-8'
      );
      expect(content).toContain("branches:");
      expect(content).toContain("'**'");
    });

    it('workflow includes pnpm install, typecheck, test:unit, build steps', () => {
      const content = readFileSync(
        resolve(projectRoot, '.github/workflows/ci.yml'),
        'utf-8'
      );
      expect(content).toContain('pnpm install');
      expect(content).toContain('pnpm typecheck');
      expect(content).toContain('pnpm test:unit');
      expect(content).toContain('pnpm build');
    });

    it('deploy step is gated on main branch', () => {
      const content = readFileSync(
        resolve(projectRoot, '.github/workflows/ci.yml'),
        'utf-8'
      );
      expect(content).toContain("refs/heads/main");
    });

    it('deploy uses FIREBASE_SERVICE_ACCOUNT secret', () => {
      const content = readFileSync(
        resolve(projectRoot, '.github/workflows/ci.yml'),
        'utf-8'
      );
      expect(content).toContain('FIREBASE_SERVICE_ACCOUNT');
    });
  });
});
