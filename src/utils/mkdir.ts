import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export function recursiveMkdirSync(path: string): void {
  if (!existsSync(path)) {
    recursiveMkdirSync(dirname(path));
    mkdirSync(path);
  }
}
