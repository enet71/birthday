// Claude Code PostToolUse hook (Write|Edit): formats the edited file with Prettier
// and records lintable files for the Stop hook (lint-changed-files.mjs).
import { readFileSync } from 'node:fs';
import { formatAndRecord } from './format-and-record.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path;

if (filePath) {
  await formatAndRecord(filePath, input.session_id);
}
