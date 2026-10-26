import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Mirrors the paths in tsconfig.app.json so the Node test runner resolves
// the same aliases Vite uses.
const aliases = [
  ['@/', new URL('../src/', import.meta.url)],
  ['@hooks/', new URL('../src/hooks/', import.meta.url)],
  ['@context/', new URL('../src/context/', import.meta.url)],
  ['@assets/', new URL('../assets/', import.meta.url)],
];

const withExtensionFallback = async (specifier, context, nextResolve) => {
  for (const suffix of [
    '.ts',
    '.tsx',
    '.js',
    '/index.ts',
    '/index.tsx',
    '/index.js',
  ]) {
    try {
      return await nextResolve(`${specifier}${suffix}`, context);
    } catch {
      continue;
    }
  }
  throw new Error(`Cannot resolve ${specifier}`);
};

export const resolve = async (specifier, context, nextResolve) => {
  const alias = aliases.find(([prefix]) => specifier.startsWith(prefix));
  if (alias) {
    const target = new URL(
      specifier.slice(alias[0].length),
      alias[1],
    ).href;
    try {
      return await nextResolve(target, context);
    } catch {
      return withExtensionFallback(target, context, nextResolve);
    }
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      specifier.startsWith('.') &&
      !/\.(?:[cm]?[jt]sx?|json)$/.test(specifier)
    ) {
      return withExtensionFallback(specifier, context, nextResolve);
    }
    throw error;
  }
};

export const load = async (url, context, nextLoad) => {
  const file = new URL(url);
  if (!file.pathname.endsWith('.ts') && !file.pathname.endsWith('.tsx'))
    return nextLoad(url, context);
  const source = await readFile(file, 'utf8');
  return {
    format: 'module',
    shortCircuit: true,
    source: ts.transpileModule(source, {
      fileName: fileURLToPath(url),
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  };
};
