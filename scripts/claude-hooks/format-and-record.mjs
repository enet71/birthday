// Shared by the PostToolUse hooks: formats a file with Prettier and records lintable files
// for the Stop hook (lint-changed-files.mjs).
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import * as prettier from 'prettier';
import { sessionFileList } from './session-files.mjs';

const lintableExtensions = new Set(['.ts', '.html', '.js', '.mjs']);

export async function formatAndRecord(filePath, sessionId) {
  if (!existsSync(filePath)) {
    return;
  }

  const absolutePath = resolve(filePath);
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const fileInfo = await prettier.getFileInfo(absolutePath, {
    ignorePath: [resolve(projectDir, '.gitignore'), resolve(projectDir, '.prettierignore')],
  });

  if (fileInfo.ignored) {
    return;
  }

  if (fileInfo.inferredParser) {
    const source = readFileSync(absolutePath, 'utf8');
    const options = await prettier.resolveConfig(absolutePath);
    const formatted = await prettier.format(source, { ...options, filepath: absolutePath });

    if (formatted !== source) {
      writeFileSync(absolutePath, formatted);
    }
  }

  if (lintableExtensions.has(extname(absolutePath))) {
    appendFileSync(sessionFileList(sessionId), `${absolutePath}\n`);
  }
}
