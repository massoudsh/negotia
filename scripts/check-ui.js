import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import babel from '../web/node_modules/next/dist/compiled/babel/bundle.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const parser = babel.parser();
let count = 0;
function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) check(path);
    else if (/\.m?js$/.test(path)) {
      const ast = parser.parse(readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['jsx', 'topLevelAwait'] });
      for (const node of ast.program.body) {
        if (node.type === 'ImportDeclaration' && node.source.value.startsWith('.')) {
          const target = resolve(dirname(path), node.source.value);
          if (![target, `${target}.js`, `${target}.mjs`, join(target, 'index.js')].some(existsSync)) throw new Error(`Missing relative import: ${path}: ${node.source.value}`);
        }
      }
      count++;
    }
  }
}
for (const directory of ['web/app', 'web/lib', 'src', 'scripts', 'test']) check(join(root, directory));
console.log(`Syntax and relative imports passed for ${count} JavaScript/JSX files.`);
