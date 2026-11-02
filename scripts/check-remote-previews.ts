import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Enrichment = Record<string, { image_candidate?: string }>;
type Preview = { url: string; checked_at: string };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const enrichment: Enrichment = JSON.parse(readFileSync(join(root, '_catalog/enrichment.json'), 'utf8'));
const output = join(root, '_catalog/remote-previews.json');
const previous: Record<string, Preview> = JSON.parse(readFileSync(output, 'utf8'));
const allowedHosts = new Set(['i.imgur.com', 'i.ibb.co']);
const result: Record<string, Preview> = {};
const now = new Date().toISOString();

function allowed(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === 'https:' && allowedHosts.has(u.hostname.toLowerCase()) &&
      /\.(png|jpe?g|gif|webp)$/i.test(u.pathname) && !/\s/.test(input);
  } catch { return false; }
}
async function checkImage(image: string): Promise<string> {
  for (const method of ['HEAD', 'GET'] as const) {
    try {
      const response = await fetch(image, {
        method,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PokemonUltimateTilesetIndex/1.0)',
          Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8',
          ...(method === 'GET' ? { Range: 'bytes=0-1023' } : {}) },
        signal: AbortSignal.timeout(11000), redirect: 'follow'
      });
      const type = response.headers.get('content-type') || '';
      const status = response.status;
      await response.body?.cancel();
      if (response.ok && type.toLowerCase().startsWith('image/')) return 'ok ' + status + ' ' + type;
      if (method === 'GET') return status + ' ' + type;
    } catch (error) {
      if (method === 'GET') return error instanceof Error ? error.name : 'error';
    }
  }
  return 'unknown';
}
async function main(): Promise<void> {
  let checked = 0;
  for (const [source, data] of Object.entries(enrichment)) {
    const image = data.image_candidate || '';
    if (!allowed(image)) continue;
    const prior = previous[source];
    if (prior?.url === image && prior.checked_at && Date.now() - Date.parse(prior.checked_at) < 14 * 86400000) {
      result[source] = prior;
      continue;
    }
    const status = await checkImage(image);
    checked++;
    console.log(status + ' | ' + source + ' | ' + image);
    if (status.startsWith('ok ')) result[source] = { url: image, checked_at: now };
  }
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log('Checked ' + checked + ' images; verified external previews: ' + Object.keys(result).length + '.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
