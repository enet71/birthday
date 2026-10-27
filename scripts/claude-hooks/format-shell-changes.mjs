// Claude Code PostToolUse hook (Bash|PowerShell): formats the files the command created or
// changed with Prettier and records lintable ones for the Stop hook. Files changed outside
// the command (for example by the developer in the IDE) are left alone.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { formatAndRecord } from './format-and-record.mjs';
import { changedFileTimes, shellSnapshotPath } from './shell-changes.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const snapshotPath = shellSnapshotPath(input.session_id, input.tool_use_id);

if (!existsSync(snapshotPath)) {
  process.exit(0);
}

const before = JSON.parse(readFileSync(snapshotPath, 'utf8'));
rmSync(snapshotPath);

for (const [filePath, time] of Object.entries(changedFileTimes())) {
  if (before[filePath] !== time) {
    await formatAndRecord(filePath, input.session_id);
  }
}
