// Claude Code Stop hook: runs ESLint with --fix on the files edited in this session
// (recorded by format-file.mjs). Remaining errors block the stop once so Claude fixes them.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { ESLint } from 'eslint';
import { sessionFileList } from './session-files.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const listPath = sessionFileList(input.session_id);

if (!existsSync(listPath)) {
  process.exit(0);
}

const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const files = [...new Set(readFileSync(listPath, 'utf8').split('\n').filter(Boolean))].filter(existsSync);
rmSync(listPath);

// Each Nx project has its own eslint.config.mjs; ESLint 9 only reads the config in its cwd.
const filesByConfigDir = new Map();

for (const file of files) {
  const configDir = findConfigDir(file);

  if (configDir) {
    filesByConfigDir.set(configDir, [...(filesByConfigDir.get(configDir) ?? []), file]);
  }
}

const problems = [];

for (const [configDir, configFiles] of filesByConfigDir) {
  const eslint = new ESLint({ cwd: configDir, fix: true, warnIgnored: false });
  const results = await eslint.lintFiles(configFiles);
  await ESLint.outputFixes(results);

  for (const result of results) {
    for (const message of result.messages.filter((item) => item.severity === 2)) {
      problems.push(`${relative(projectDir, result.filePath)}:${message.line}:${message.column} ${message.message} (${message.ruleId ?? 'eslint'})`);
    }
  }
}

if (problems.length === 0) {
  process.exit(0);
}

const report = `ESLint errors in files edited this session:\n${problems.join('\n')}`;

if (input.stop_hook_active) {
  console.log(JSON.stringify({ systemMessage: report }));
  process.exit(0);
}

console.error(`${report}\nFix these errors before finishing.`);
process.exit(2);

function findConfigDir(file) {
  let dir = dirname(file);

  while (dir.startsWith(projectDir)) {
    if (existsSync(resolve(dir, 'eslint.config.mjs'))) {
      return dir;
    }

    const parent = dirname(dir);

    if (parent === dir) {
      break;
    }

    dir = parent;
  }

  return null;
}
