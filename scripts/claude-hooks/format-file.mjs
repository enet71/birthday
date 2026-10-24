// Claude Code PostToolUse hook (Write|Edit): formats the edited file with Prettier
// and records lintable files for the Stop hook (lint-changed-files.mjs).
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import * as prettier from 'prettier';
import { sessionFileList } from './session-files.mjs';

const lintableExtensions = new Set(['.ts', '.html', '.js', '.mjs']);

const input = JSON.parse(readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path;

if (!filePath || !existsSync(filePath)) {
  process.exit(0);
}

const absolutePath = resolve(filePath);
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const fileInfo = await prettier.getFileInfo(absolutePath, {
  ignorePath: [resolve(projectDir, '.gitignore'), resolve(projectDir, '.prettierignore')],
});

if (!fileInfo.ignored && fileInfo.inferredParser) {
  const source = readFileSync(absolutePath, 'utf8');
  const options = await prettier.resolveConfig(absolutePath);
  const formatted = await prettier.format(source, { ...options, filepath: absolutePath });

  if (formatted !== source) {
    writeFileSync(absolutePath, formatted);
  }
}

if (!fileInfo.ignored && lintableExtensions.has(extname(absolutePath))) {
  appendFileSync(sessionFileList(input.session_id), `${absolutePath}\n`);
}
