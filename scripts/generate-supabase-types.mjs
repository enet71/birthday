import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectId = 'wpnrneoqvxddhbltmysx';
const target = resolve(process.cwd(), 'libs', 'web', 'supabase', 'src', 'lib', 'types', 'database.types.ts');
const run = (args) => execFileSync('npx', args, { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'inherit'] });

// Generate first and write after, so a failed run (for example, not logged in) keeps the current types.
const types = run(['supabase', 'gen', 'types', 'typescript', '--project-id', projectId]);

writeFileSync(target, types);
run(['prettier', '--write', target]);
