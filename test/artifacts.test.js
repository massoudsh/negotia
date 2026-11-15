import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const read = path => readFileSync(join(projectRoot, path), 'utf8');

function walk(directory, files = []) {
  for (const entry of readdirSync(join(projectRoot, directory), { withFileTypes: true })) {
    const relative = join(directory, entry.name);
    if (entry.isDirectory()) walk(relative, files);
    else if (/\.m?js$/.test(entry.name)) files.push(relative);
  }
  return files;
}

test('tests write scratch files to the OS temp directory, never into the repository', () => {
  const offenders = [];
  for (const file of walk('test')) {
    const source = read(file);
    // Any write target that resolves inside the project is a repository artifact.
    if (/new URL\(\s*['"]\.\.\/(outputs|data|tmp)\//.test(source)) offenders.push(`${file}: writes outside the temp directory`);
    if (/\bmkdirSync\(\s*fileURLToPath\(\s*new URL\(\s*['"]\.\.\//.test(source)) offenders.push(`${file}: creates directories in the repository`);
  }
  assert.deepEqual(offenders, [], 'use test/helpers/scratch.js for scratch files');
});

test('generated output directories are ignored and not tracked', () => {
  const gitignore = read('.gitignore');
  assert.match(gitignore, /^\/outputs\/$/m);
  assert.match(gitignore, /^\/data\/$/m);

  if (existsSync(join(projectRoot, '.git/index'))) {
    const index = readFileSync(join(projectRoot, '.git/index'));
    assert.equal(index.includes(Buffer.from('outputs/negotia-wiki-vault.zip')), false, 'generated archives must not be committed');
  }
});

test('the scratch helper always cleans up after the test file', () => {
  const helper = read('test/helpers/scratch.js');
  assert.match(helper, /tmpdir\(\)/, 'scratch files must live in the OS temp directory');
  assert.match(helper, /after\(\(\) => rmSync\(directory, \{ recursive: true, force: true \}\)\)/, 'scratch directories must be removed');
});
