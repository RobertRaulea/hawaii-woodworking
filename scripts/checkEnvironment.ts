import { loadEnv } from 'vite';
import { validateFrontendEnvironment } from '../shared/environment.ts';

try {
  const mode = process.argv[2] ?? 'development';
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const config = validateFrontendEnvironment(env);
  console.log(`Environment: ${config.name}\nConvex: ${config.convexUrl}\nSite: ${config.siteUrl}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid environment.');
  process.exitCode = 1;
}
