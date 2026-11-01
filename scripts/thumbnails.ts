/**
 * Generate local, low-resolution WEBP previews from real tileset imagery.
 *
 * Usage:
 *   npm run thumbnails -- --limit=100
 *   npm run thumbnails -- --limit=700 --retry
 *
 * Originals aren't committed. Only small derived previews are kept.
 * If an artist doesn't permit thumbnail redistribution, remove the preview or
 * add the source URL to _catalog/preview-exclusions.json.
 */
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Entry = { title: string; artist: string; source_url: string; folder: string; [key: string]: unknown };
type Thumb = { file: string; source: string; generated_at: string };
type SourceInfo = { image_url: string; source_note?: string };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = join(ROOT, '_catalog', 'catalog.json');
const MANIFEST = join(ROOT, 'site', 'public', 'previews', 'manifest.json');
const OUTPUT = dirname(MANIFEST);
const CHECKS = join(ROOT, '_catalog', 'thumbnail-checks.json');
const EXCLUSIONS = join(ROOT, '_catalog', 'preview-exclusions.json');
const OVERRIDES = join(ROOT, '_catalog', 'thumbnail-sources.json');
const entries: Entry[] = JSON.parse(readFileSync(CATALOG, 'utf8')).entries;
const manifest: Record<string, Thumb> = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const checks: Record<string, string> = existsSync(CHECKS) ? JSON.parse(readFileSync(CHECKS, 'utf8')) : {};
const excluded: string[] = existsSync(EXCLUSIONS) ? JSON.parse(readFileSync(EXCLUSIONS, 'utf8')) : [];
const sources: Record<string, SourceInfo> = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, 'utf8')) : {};
const limit = Number(process.argv.find(s => s.startsWith('--limit='))?.split('=')[1] || '100');
const retry = process.argv.includes('--retry');
const MAX_BYTES = 8_000_000;
const BAD_IMAGES = /avatar|logo|favicon|default|placeholder|sprite-emoji|smilie|emoji|icon_resized|ee_icon|badge|site-icon|site_logo|icon\.png/i;
const SITE_PAGES = new Set(['discord.com', 'www.discord.com', 'github.com', 'www.github.com']);
const verbose = process.argv.includes('--verbose');
let diagnostics = 0;
mkdirSync(OUTPUT, { recursive: true });
const now = new Date().toISOString();

function validUrl(s: string): string {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch { return ''; }
}
function decode(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function candidate(url: string, base: string): string {
  try {
    const u = new URL(decode(url), base);
    if (!['https:', 'http:'].includes(u.protocol) || BAD_IMAGES.test(u.pathname)) return '';
    return u.href;
  } catch { return ''; }
}
async function get(url: string, accept: string): Promise<Response | undefined> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TilesetGalleryIndexer/2.0; image thumbnails link back to the artists)',
        'Accept': accept },
      redirect: 'follow', signal: AbortSignal.timeout(9000),
    });
    if (verbose && diagnostics < 15) {
      const host = new URL(url).hostname;
      if (host.includes('deviantart') || host.includes('spriters-resource')) {
        console.log('Resolver: ' + host + ' HTTP ' + response.status + ' (' + (response.headers.get('content-type') || '?') + ')');
        diagnostics++;
      }
    }
    return response.ok ? response : undefined;
  } catch { return undefined; }
}
async function imageBuffer(url: string): Promise<Buffer | undefined> {
  const response = await get(url, 'image/png,image/jpeg,image/webp,image/gif,image/*;q=0.8');
  if (!response) return;
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_BYTES) return;
  const mime = response.headers.get('content-type') || '';
  if (!mime.startsWith('image/')) return;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_BYTES || buffer.length < 250) return;
  return buffer;
}
function attrs(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) {
    result[match[1].toLowerCase()] = decode(match[3]);
  }
  return result;
}
function findCandidates(html: string, source: string): string[] {
  const pool: string[] = [];
  for (const match of html.slice(0, 600000).matchAll(/<meta\b[^>]+>/gi)) {
    const attr = attrs(match[0]);
    const property = attr.property || attr.name;
    if (['og:image', 'og:image:url', 'twitter:image'].includes(property)) pool.push(attr.content || '');
  }
  // Resource forum attachments are usually the actual tileset, not a social icon.
  const attachments = [...html.matchAll(/(?:href|data-src|src)\s*=\s*["']([^"']*\/attachments\/[^"']+)["']/gi)]
    .map(m => m[1]);
  pool.unshift(...attachments.filter(x => /\.(png|webp|jpe?g|gif)(?:[/?#]|$)/i.test(x)));
  // Spriters Resource previews and uploaded resource graphics.
  const sheets = [...html.matchAll(/(?:href|data-src|src)\s*=\s*["']([^"']*(?:\/resources\/sheets\/|\/sheets\/)[^"']+\.(?:png|jpe?g|webp)[^"']*)["']/gi)]
    .map(m => m[1]);
  pool.unshift(...sheets);
  return [...new Set(pool.map(x => candidate(x, source)).filter(Boolean))].slice(0, 6);
}
async function resolvePublicImage(entry: Entry): Promise<string[]> {
  const source = validUrl(entry.source_url);
  if (!source) return [];
  const host = new URL(source).hostname.toLowerCase();
  // Links to GitHub repositories and Discord invitations rarely point to one image.
  // Use a reviewed thumbnail source override for these instead of a social-card icon.
  if (SITE_PAGES.has(host)) return [];
  if (/\.(png|jpe?g|gif|webp)(?:[?#]|$)/i.test(source)) return [source];
  const urls: string[] = [];
  if (/(^|\.)deviantart\.com$/i.test(new URL(source).hostname)) {
    const response = await get('https://backend.deviantart.com/oembed?format=json&url=' + encodeURIComponent(source), 'application/json');
    if (response) {
      try {
        const data = await response.json() as { thumbnail_url?: string; url?: string };
        const thumbnail = candidate(data.thumbnail_url || data.url || '', source);
        if (thumbnail) urls.push(thumbnail);
      } catch { /* not available */ }
    }
  }
  const page = await get(source, 'text/html');
  if (page && (page.headers.get('content-type') || '').includes('text/html')) {
    urls.push(...findCandidates(await page.text(), source));
  }
  return [...new Set(urls)];
}
async function makeThumbnail(entry: Entry, bytes: Buffer, source: string): Promise<boolean> {
  try {
    const meta = await sharp(bytes, { limitInputPixels: 30_000_000 }).metadata();
    if (!meta.width || !meta.height || meta.width < 160 || meta.height < 100) return false;
    // Crop nothing: preserve the artist's original composition and transparent areas.
    const thumb = await sharp(bytes, { limitInputPixels: 30_000_000, animated: false })
      .rotate()
      .resize({ width: 480, height: 310, fit: 'inside', withoutEnlargement: true, kernel: 'nearest' })
      .webp({ quality: 76, effort: 5 })
      .toBuffer();
    if (!thumb.length || thumb.length > 250_000) return false;
    const file = createHash('sha256').update(entry.source_url).digest('hex').slice(0, 20) + '.webp';
    writeFileSync(join(OUTPUT, file), thumb);
    manifest[entry.folder] = { file, source, generated_at: now };
    return true;
  } catch { return false; }
}
function localAsset(entry: Entry): string | undefined {
  const directory = join(ROOT, entry.folder);
  if (!existsSync(directory)) return;
  const file = readdirSync(directory).find(f => /^(tileset|preview)\.(png|jpe?g|gif|webp)$/i.test(f));
  return file ? join(directory, file) : undefined;
}
async function processEntry(entry: Entry): Promise<boolean> {
  const local = localAsset(entry);
  if (local) return makeThumbnail(entry, readFileSync(local), entry.folder);
  const override = sources[entry.source_url];
  if (override?.image_url) {
    const bytes = await imageBuffer(validUrl(override.image_url));
    if (bytes && await makeThumbnail(entry, bytes, override.source_note || entry.source_url)) return true;
  }
  for (const image of await resolvePublicImage(entry)) {
    const bytes = await imageBuffer(image);
    if (bytes && await makeThumbnail(entry, bytes, entry.source_url)) return true;
  }
  return false;
}
async function main() {
  let changed = 0, attempted = 0;
  const candidates = entries.filter(entry => {
    if (excluded.includes(entry.source_url)) return false;
    if (manifest[entry.folder] && existsSync(join(OUTPUT, manifest[entry.folder].file))) return false;
    if (!retry && checks[entry.source_url] && Date.now() - Date.parse(checks[entry.source_url]) < 30 * 86400000) return false;
    return true;
  }).slice(0, Math.max(0, limit));
  let cursor = 0;
  const workers = Array.from({ length: Math.min(5, candidates.length) }, async () => {
    while (cursor < candidates.length) {
      const entry = candidates[cursor++];
      const ok = await processEntry(entry);
      attempted++;
      checks[entry.source_url] = now;
      if (ok) changed++;
    }
  });
  await Promise.all(workers);
  for (const [folder, info] of Object.entries(manifest)) {
    if (excluded.some(url => entries.some(e => e.folder === folder && e.source_url === url))) {
      rmSync(join(OUTPUT, info.file), { force: true });
      delete manifest[folder];
    }
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(CHECKS, JSON.stringify(checks, null, 2) + '\n');
  console.log('Created ' + changed + ' real local thumbnails from ' + attempted + ' inspected entries (' +
    Object.keys(manifest).length + ' total). Unavailable or inaccessible assets are not faked.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
