import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after } from 'node:test';

/**
 * Creates scratch files in the operating system's temp directory instead of inside
 * the project, so running the tests never produces artifacts in the repository.
 * The directory is removed when the test file finishes.
 */
export function scratchDirectory(prefix = 'negotia-test-') {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

/** Path for a scratch file inside a directory returned by scratchDirectory(). */
export function scratchFile(directory, name) {
  return join(directory, name);
}
