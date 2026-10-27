// Shared by the shell hooks: lists changed files with their modification times, so the
// PostToolUse hook can tell which files a single shell command touched.
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export function shellSnapshotPath(sessionId, toolUseId) {
  return join(tmpdir(), `claude-shell-${sessionId ?? 'unknown'}-${toolUseId ?? 'unknown'}.json`);
}

export function changedFileTimes() {
  const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const output = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: projectDir,
    encoding: 'utf8',
  });
  const entries = output.split('\0').filter(Boolean);
  const times = {};

  for (let index = 0; index < entries.length; index++) {
    const status = entries[index].slice(0, 2);
    const filePath = resolve(projectDir, entries[index].slice(3));

    // A rename or copy entry is followed by its source path.
    if (status.includes('R') || status.includes('C')) {
      index++;
    }

    if (existsSync(filePath)) {
      times[filePath] = statSync(filePath).mtimeMs;
    }
  }

  return times;
}
