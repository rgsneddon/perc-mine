import { pathToFileURL } from 'node:url';

/**
 * True when this module is the process entry (Windows + POSIX).
 * `file://${argv[1]}` is wrong on Windows (file:///C:/... vs file://C:\...).
 */
export function isMainModule(importMetaUrl, argv1 = process.argv[1]) {
  if (!importMetaUrl || !argv1) return false;
  try {
    return importMetaUrl === pathToFileURL(argv1).href;
  } catch {
    return false;
  }
}
