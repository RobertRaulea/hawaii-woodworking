import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadEnv } from 'vite';
import { validateFrontendEnvironment } from '../shared/environment.ts';

const environment = validateFrontendEnvironment(loadEnv('test', process.cwd(), 'VITE_'));
if (environment.name !== 'test') throw new Error('Only TEST publishing is supported by this command.');
const projectId = 'prj_VYG1oJM0Yl9QmIAEg2YKt0oWw7Vh';
const orgId = 'team_mzFZr8dDj1tOT6UbQrO6vftw';
if (existsSync('.vercel/project.json')) {
  const linked = JSON.parse(readFileSync('.vercel/project.json', 'utf8')) as {
    projectId?: unknown; orgId?: unknown;
  };
  if (linked.projectId !== projectId || linked.orgId !== orgId) {
    throw new Error('Existing Vercel link is not TEST. Use a separate checkout; it will not be overwritten.');
  }
}
mkdirSync('.vercel', { recursive: true });
writeFileSync('.vercel/project.json', JSON.stringify({ projectId, orgId, projectName: 'hawaii-woodworking-test' }));
execFileSync('npm', ['run', 'test:sync'], { stdio: 'inherit' });
execFileSync('npx', ['--yes', 'vercel', 'deploy', '--prod', '--yes', '--scope', orgId], {
  stdio: 'inherit',
  env: { ...process.env, VERCEL_PROJECT_ID: projectId, VERCEL_ORG_ID: orgId },
});
