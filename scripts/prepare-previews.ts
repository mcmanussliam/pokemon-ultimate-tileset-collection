import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Entry = { source_url: string; folder: string; id: string };
type Approval = { approved: boolean; evidence_url: string; attribution: string };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries: Entry[] = JSON.parse(readFileSync(join(root, '_catalog/catalog.json'), 'utf8')).entries;
const approvals: Record<string, Approval> = JSON.parse(readFileSync(join(root, '_catalog/preview-permissions.json'), 'utf8'));
const dest = join(root, 'site/public/previews');
mkdirSync(dest, { recursive: true });
for (const name of readdirSync(dest)) if (name.endsWith('.webp')) rmSync(join(dest, name));
const manifest: Record<string, string> = {};
for (const entry of entries) {
  const approved = approvals[entry.source_url];
  if (!approved?.approved || !approved.evidence_url || !approved.attribution) continue;
  const image = join(root, entry.folder, 'preview.webp');
  if (!existsSync(image)) continue;
  const output = entry.id + '.webp';
  if (!/^[a-z0-9-]+\.webp$/.test(output)) continue;
  copyFileSync(image, join(dest, output));
  manifest[entry.folder] = output;
}
writeFileSync(join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared ' + Object.keys(manifest).length + ' approved local thumbnails.');
