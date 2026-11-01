import sharp from 'sharp';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Entry = { source_url: string; folder: string };
type Extra = { excerpt?: string; image_candidate?: string; source_author?: string; source_title?: string; status?: string; checked_at?: string; preview_local?: boolean };
type Approval = { approved: boolean; evidence_url: string; attribution: string; image_url?: string };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries: Entry[] = JSON.parse(readFileSync(join(root, '_catalog/catalog.json'), 'utf8')).entries;
const detailsPath = join(root, '_catalog/enrichment.json');
const details: Record<string, Extra> = JSON.parse(readFileSync(detailsPath, 'utf8'));
const approvals: Record<string, Approval> = JSON.parse(readFileSync(join(root, '_catalog/preview-permissions.json'), 'utf8'));
const limit = Math.max(0, Math.min(800, Number(process.argv.find(x => x.startsWith('--limit='))?.split('=')[1] || 90)));
const force = process.argv.includes('--force');
const onlyApproved = process.argv.includes('--local-only');
const now = new Date().toISOString();
const userAgent = 'PokemonUltimateTilesetCollection/1.0 (credited artwork index)';
const badImage = /avatar|favicon|default|logo|\/styles\/|social|site_icon|placeholder/i;

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
function imageUrl(input: string, origin: string): string {
  try {
    const u = new URL(input.replace(/&amp;/g, '&'), origin);
    return badImage.test(u.pathname) ? '' : validUrl(u.href);
  } catch { return ''; }
}
async function get(url: string, accept = 'text/html,application/json'): Promise<Response> {
  return fetch(url, {
    headers: { 'User-Agent': userAgent, 'Accept': accept, 'Accept-Encoding': 'gzip, deflate' },
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
    const result = await get('https://backend.deviantart.com/oembed?format=json&url=' + encodeURIComponent(source));
    if (!result.ok) return { status: 'http_' + result.status };
    const data = await result.json() as { title?: string; author_name?: string; thumbnail_url?: string; description?: string };
    return { status: 'ok', source_title: text(data.title || '').slice(0, 140) || undefined,
      source_author: text(data.author_name || '').slice(0, 80) || undefined,
      excerpt: text(data.description || '').slice(0, 230) || undefined,
      image_candidate: imageUrl(data.thumbnail_url || '', source) || undefined };
  }
  const response = await get(source);
  if (!response.ok) return { status: 'http_' + response.status };
  if (!(response.headers.get('content-type') || '').includes('text/html')) return { status: 'not_html' };
  const html = (await response.text()).slice(0, 600000);
  const m = metadata(html);
  // XenForo resources commonly embed the actual image in the post body, not in og:image.
  // Only take obvious content images, never avatars or social icons.
  let postImage = '';
  const post = html.match(/<div[^>]+class=["'][^"']*bbWrapper[^"']*["'][^>]*>([\s\S]{0,22000})/i)?.[1] || '';
  for (const tag of post.match(/<img\b[^>]*>/gi) || []) {
    const attrs = [...tag.matchAll(/(?:data-src|src)\s*=\s*(["'])(.*?)\1/gi)];
    for (const attr of attrs) {
      const candidate = imageUrl(attr[2], source);
      if (candidate && /(?:i\.ibb\.co|\/attachments\/|\/data\/attachments\/|imgur\.com\/|\/uploads\/)/i.test(candidate)) {
        postImage = candidate;
        break;
      }
    }
    if (postImage) break;
  }
  let excerpt = m['og:description'] || m.description || '';
  if (excerpt.length < 40 && host.endsWith('eeveeexpo.com')) {
    excerpt = text(html.match(/<div[^>]+class=["'][^"']*bbWrapper[^"']*["'][^>]*>([\s\S]{0,6000})/i)?.[1] || '');
  }
  return { status: 'ok', source_title: (m['og:title'] || '').slice(0, 140) || undefined,
    excerpt: excerpt.slice(0, 230) || undefined,
    image_candidate: postImage || imageUrl(m['og:image'] || m['twitter:image'] || '', source) || undefined };
}
async function saveApproved(entry: Entry, extra: Extra): Promise<boolean> {
  const approved = approvals[entry.source_url];
  if (!approved?.approved || !validUrl(approved.evidence_url) || !approved.attribution.trim()) return false;
  const image = imageUrl(approved.image_url || extra.image_candidate || '', entry.source_url);
  if (!image || !existsSync(join(root, entry.folder))) return false;
  try {
    const response = await get(image, 'image/png,image/jpeg,image/webp,image/gif,image/*');
    if (!response.ok || !(response.headers.get('content-type') || '').startsWith('image/')) return false;
    if (Number(response.headers.get('content-length') || '0') > 8_000_000) return false;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 512 || bytes.length > 8_000_000) return false;
    const base = sharp(bytes, { limitInputPixels: 30_000_000, animated: false });
    const size = await base.metadata();
    if (!size.width || !size.height || size.width < 160 || size.height < 100) return false;
    const thumb = await base.resize(520, 360, { fit: 'inside', withoutEnlargement: true, kernel: 'nearest' })
      .webp({ quality: 78, effort: 5 }).toBuffer();
    if (thumb.length > 240000) return false;
    writeFileSync(join(root, entry.folder, 'preview.webp'), thumb);
    writeFileSync(join(root, entry.folder, 'preview-credit.json'), JSON.stringify({
      attribution: approved.attribution, evidence_url: approved.evidence_url,
      source_url: entry.source_url, image_url: image
    }, null, 2) + '\n');
    return true;
  } catch { return false; }
}
async function main() {
  const ordered = [...entries].sort((a,b) =>
    Number(a.source_url.includes('deviantart.com')) - Number(b.source_url.includes('deviantart.com')));
  const selected = ordered.filter(e => onlyApproved ? !!approvals[e.source_url]?.approved :
    force || !details[e.source_url]?.checked_at ||
    Date.now() - Date.parse(details[e.source_url].checked_at || '') > 30 * 86400000 ||
    (!!approvals[e.source_url]?.approved && !details[e.source_url]?.preview_local)).slice(0, limit);
  let ok = 0, saved = 0, forbidden = 0;
  for (const entry of selected) {
    let inspected: Extra = {};
    if (!onlyApproved) {
      try { inspected = await inspect(entry); }
      catch { inspected = { status: 'network_error' }; }
    }
    if (inspected.status === 'ok') ok++;
    if (inspected.status === 'http_403') forbidden++;
    const merged: Extra = { ...details[entry.source_url], ...inspected, checked_at: onlyApproved ?
      details[entry.source_url]?.checked_at : now };
    if (await saveApproved(entry, merged)) {
      merged.preview_local = true;
      saved++;
    }
    details[entry.source_url] = merged;
  }
  writeFileSync(detailsPath, JSON.stringify(details, null, 2) + '\n');
  console.log('Checked ' + selected.length + ' sources. Metadata fetched: ' + ok +
    ', denied with 403: ' + forbidden + ', authorised local previews: ' + saved + '.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
