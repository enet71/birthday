import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function sessionFileList(sessionId) {
  return join(tmpdir(), `claude-lint-${sessionId ?? 'unknown'}.txt`);
}
