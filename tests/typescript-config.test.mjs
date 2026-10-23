import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const parseConfig = (name) => {
  const config = ts.getParsedCommandLineOfConfigFile(
    `${root}${name}`,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        );
      },
    },
  );
  assert.ok(config);
  assert.equal(config.errors.length, 0);
  return config;
};

test('the root solution references the app and scripts without compiling app files twice', () => {
  const config = parseConfig('tsconfig.json');
  assert.equal(config.fileNames.length, 0);
  assert.deepEqual(
    config.projectReferences.map(({ path }) => path),
    [`${root}tsconfig.app.json`, `${root}tsconfig.node.json`],
  );
  const program = ts.createProgram({
    rootNames: config.fileNames,
    options: config.options,
    projectReferences: config.projectReferences,
  });
  assert.equal(program.getOptionsDiagnostics().length, 0);
});

test('the app resolves frontend aliases without the deprecated baseUrl option', () => {
  const config = parseConfig('tsconfig.app.json');
  assert.equal(config.options.baseUrl, undefined);
  assert.equal(config.options.strict, true);
  assert.equal(config.options.noEmit, true);
  for (const [specifier, expected] of [
    ['@/types/product.types', 'src/types/product.types.ts'],
    ['@hooks/useStaffAccess', 'src/hooks/useStaffAccess.ts'],
    ['@context/CartContext', 'src/context/CartContext.tsx'],
  ]) {
    const { resolvedModule } = ts.resolveModuleName(
      specifier,
      `${root}src/App.tsx`,
      config.options,
      ts.sys,
    );
    assert.equal(resolvedModule?.resolvedFileName, `${root}${expected}`);
  }
  assert.deepEqual(config.options.paths['@assets/*'], ['./assets/*']);
  assert.equal(parseConfig('tsconfig.json').options.baseUrl, undefined);
});
