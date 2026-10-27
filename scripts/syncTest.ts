import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';

const local = parse(readFileSync('.env.local'));
const base = existsSync('.env') ? parse(readFileSync('.env')) : {};
if (local.CONVEX_DEPLOYMENT !== 'dev:exuberant-fox-228' ||
    local.VITE_CONVEX_URL !== 'https://exuberant-fox-228.convex.cloud' ||
    [process.env, local, base].some((env) => env.CONVEX_DEPLOY_KEY || env.CONVEX_SELF_HOSTED_URL) ||
    (process.env.CONVEX_DEPLOYMENT && process.env.CONVEX_DEPLOYMENT !== local.CONVEX_DEPLOYMENT)) {
  throw new Error('Refusing TEST sync: local deployment selection or deploy-key override is unsafe.');
}
execFileSync('./node_modules/.bin/convex', ['dev', '--once', '--typecheck', 'enable'], {
  stdio: 'inherit',
});
