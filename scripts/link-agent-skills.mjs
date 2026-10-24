import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const workspaceRoot = process.cwd();
const source = resolve(workspaceRoot, '.agents', 'skills');
const destinations = ['.claude/skills'].map((location) =>
  resolve(workspaceRoot, location),
);

for (const destination of destinations) {
  if (existsSync(destination)) {
    const entry = lstatSync(destination);

    if (
      !entry.isSymbolicLink() &&
      (!entry.isDirectory() || readdirSync(destination).length > 0)
    ) {
      throw new Error(
        `Refusing to replace non-empty directory: ${destination}`,
      );
    }

    if (entry.isSymbolicLink()) {
      unlinkSync(destination);
    } else {
      rmSync(destination, { force: true, recursive: true });
    }
  }

  mkdirSync(dirname(destination), { recursive: true });
  symlinkSync(relative(dirname(destination), source), destination, 'junction');
  console.log(`Linked ${destination} to .agents/skills`);
}
