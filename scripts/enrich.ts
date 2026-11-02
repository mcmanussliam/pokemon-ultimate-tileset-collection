import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Entry = { source_url: string };
type Extra = { excerpt?: string; source_author?: string; source_title?: string; status?: string; checked_at?: string };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries: Entry[] = JSON.parse(readFileSync(join(root, '_catalog/catalog.json'), 'utf8')).entries;
const detailsPath = join(root, '_catalog/enrichment.json');
const details: Record<string, Extra> = JSON.parse(readFileSync(detailsPath, 'utf8'));
const limit = Math.max(0, Math.min(800, Number(process.argv.find(x => x.startsWith('--limit='))?.split('=')[1] || 90)));
const force = process.argv.includes('--force');
const now = new Date().toISOString();
const userAgent = 'PokemonUltimateTilesetCollection/1.0 (credited artwork index)';

function validUrl(input: string): string {
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:' || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname)) return '';
    return u.href;
  } catch { return ''; }
}
function text(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"').replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ')
    .replace(/&middot;/gi, '·').replace(/&hellip;/gi, '…')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => {
      const code = n.startsWith('x') ? parseInt(n.slice(1), 16) : Number(n);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    })
    .replace(/[\u200b-\u200f\ufeff]/g, '').replace(/\s+/g, ' ').trim();
}
async function get(url: string): Promise<Response> {
  return fetch(url, {
    headers: { 'User-Agent': userAgent, 'Accept': 'text/html,application/json', 'Accept-Encoding': 'gzip, deflate' },
    redirect: 'follow', signal: AbortSignal.timeout(12000)
  });
}
function metadata(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const tag of html.slice(0, 350000).match(/<meta\b[^>]+>/gi) || []) {
    const attr: Record<string, string> = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) attr[m[1].toLowerCase()] = m[3];
    const key = (attr.property || attr.name || '').toLowerCase();
    if (key && attr.content) result[key] = text(attr.content);
  }
  return result;
}
async function inspect(entry: Entry): Promise<Extra> {
  const source = validUrl(entry.source_url);
  if (!source) return { status: 'invalid_url' };
  const host = new URL(source).hostname;
  if (host === 'discord.com' || host === 'github.com') return { status: 'manual' };
  if (host.endsWith('deviantart.com')) {
    const response = await get('https://backend.deviantart.com/oembed?format=json&url=' + encodeURIComponent(source));
    if (!response.ok) return { status: 'http_' + response.status };
    const data = await response.json() as { title?: string; author_name?: string; description?: string };
    return { status: 'ok', source_title: text(data.title || '').slice(0, 140) || undefined,
      source_author: text(data.author_name || '').slice(0, 80) || undefined,
      excerpt: text(data.description || '').slice(0, 230) || undefined };
  }
  const response = await get(source);
  if (!response.ok) return { status: 'http_' + response.status };
  if (!(response.headers.get('content-type') || '').includes('text/html')) return { status: 'not_html' };
  const html = (await response.text()).slice(0, 600000);
  const m = metadata(html);
  let excerpt = m['og:description'] || m.description || '';
  if (excerpt.length < 40 && host.endsWith('eeveeexpo.com')) {
    excerpt = text(html.match(/<div[^>]+class=["'][^"']*bbWrapper[^"']*["'][^>]*>([\s\S]{0,6000})/i)?.[1] || '');
  }
  return { status: 'ok', source_title: (m['og:title'] || '').slice(0, 140) || undefined,
    excerpt: excerpt.slice(0, 230) || undefined };
}
async function main(): Promise<void> {
  const ordered = [...entries].sort((a,b) =>
    Number(a.source_url.includes('deviantart.com')) - Number(b.source_url.includes('deviantart.com')));
  const selected = ordered.filter(e => force || !details[e.source_url]?.checked_at ||
    Date.now() - Date.parse(details[e.source_url].checked_at || '') > 30 * 86400000).slice(0, limit);
  let ok = 0, forbidden = 0, deviantArtDenied = 0, checked = 0;
  for (const entry of selected) {
    if (entry.source_url.includes('deviantart.com') && deviantArtDenied >= 3) {
      console.log('DeviantArt returned repeated 403 responses. Skipping remaining DeviantArt entries.');
      break;
    }
    let inspected: Extra;
    try { inspected = await inspect(entry); }
    catch { inspected = { status: 'network_error' }; }
    checked++;
    if (inspected.status === 'ok') ok++;
    if (inspected.status === 'http_403') {
      forbidden++;
      if (entry.source_url.includes('deviantart.com')) deviantArtDenied++;
    }
    details[entry.source_url] = { ...details[entry.source_url], ...inspected, checked_at: now };
  }
  writeFileSync(detailsPath, JSON.stringify(details, null, 2) + '\n');
  console.log('Checked ' + checked + ' sources. Descriptions fetched: ' + ok + ', denied with 403: ' + forbidden + '.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
