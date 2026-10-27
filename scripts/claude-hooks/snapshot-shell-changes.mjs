// Claude Code PreToolUse hook (Bash|PowerShell): records the changed files before the command
// runs, for format-shell-changes.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { changedFileTimes, shellSnapshotPath } from './shell-changes.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));

writeFileSync(shellSnapshotPath(input.session_id, input.tool_use_id), JSON.stringify(changedFileTimes()));
