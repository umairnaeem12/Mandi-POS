// Uploaded files are served from the backend root (e.g. http://host:4000/uploads/..).
import { getServerRoot } from './config';

export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${getServerRoot()}${path}`;
}
