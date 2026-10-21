import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const resolve = async (specifier, context, nextResolve) => {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      specifier.startsWith('.') &&
      !/\.(?:[cm]?[jt]sx?|json)$/.test(specifier)
    ) {
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
