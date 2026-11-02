import catalog from '../../_catalog/catalog.json';
import enrichment from '../../_catalog/enrichment.json';
import previews from '../public/previews/manifest.json';
import remotePreviews from '../../_catalog/remote-previews.json';
import './style.css';

type Entry = {
  id: string; title: string; artist: string; category_1: string; category_2: string;
  generation: string; source_url: string; credits: string; sheet: string;
  folder: string; subcategory: string;
};
const entries = catalog.entries as unknown as Entry[];
type Extra = { excerpt?: string; source_title?: string; source_author?: string };
const details = enrichment as Record<string, Extra>;
const thumbnails = previews as Record<string, string>;
const embeds = remotePreviews as Record<string, { url: string; checked_at: string }>;
const COLLECTION = 'Pokémon Ultimate Tileset Collection';
const REPO = 'https://github.com/mcmanussliam/pokemon-ultimate-tileset-collection';
const SHEET = 'https://docs.google.com/spreadsheets/d/1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8/edit?gid=0#gid=0';
const GROUPS = [
  ['all', 'All categories'],
  ['outdoor-tilesets', 'Outdoor'],
  ['indoor-tilesets', 'Indoor'],
  ['indoor-outdoor-tilesets', 'Indoor + outdoor'],
  ['misc-tilesets', 'Misc'],
  ['animated-tilesets', 'Animated'],
  ['auto-tilesets', 'Autotiles'],
  ['in-out-misc-etc', 'Collections'],
] as const;
const params = new URLSearchParams(location.search);
const state = {
  search: params.get('q') || '',
  category: params.get('category') || 'all',
  subcategory: params.get('type') || 'all',
  generation: params.get('gen') || 'all',
  layout: params.get('view') === 'grid' ? 'grid' : 'list',
  previewsOnly: params.get('previews') === '1',
  page: 1,
};
let activeTile = params.get('tile') || '';
const $ = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error('Missing element: ' + id);
  return element as T;
};
function text(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function link(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch { return ''; }
}
function title(value: string): string {
  return value.replace(/ on DeviantArt$/i, '').replace(/\s*\|\s*Eevee Expo$/i, '')
    .replace(/ - The Spriters Resource$/i, '');
}
function label(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b[a-z]/g, c => c.toUpperCase())
    .replace(/\bFrlg\b/g, 'FRLG').replace(/\bHgss\b/g, 'HGSS');
}
function categoryOf(entry: Entry): string { return entry.folder.split('/')[1]; }
function pathFor(entry: Entry): string {
  return REPO + '/tree/main/' + entry.folder.split('/').map(encodeURIComponent).join('/');
}
function imageFor(entry: Entry): string {
  const file = thumbnails[entry.folder];
  if (file && /^[a-z0-9-]+\.webp$/.test(file)) return import.meta.env.BASE_URL + 'previews/' + file;
  // Only embed image URLs that passed a live content-type check on trusted image hosts.
  // Remote artwork is never copied into this repository without creator permission.
  const remote = embeds[entry.source_url]?.url || '';
  try {
    const url = new URL(remote);
    if (url.protocol === 'https:' && (url.hostname === 'i.imgur.com' || url.hostname === 'i.ibb.co') &&
        /\.(png|jpe?g|gif|webp)$/i.test(url.pathname)) return remote;
  } catch { /* No preview. */ }
  return '';
}
function picture(entry: Entry, large = false): string {
  const image = imageFor(entry);
  if (!image) return '';
  const external = image.startsWith('https://');
  return '<img class="preview-thumb' + (large ? ' preview-large' : '') + '" src="' +
    text(image) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="Artwork preview by ' +
    text(entry.artist) + '"' + (external ? ' title="Image served by the original image host"' : '') + ' />';
}
function categoryOptions() {
  return GROUPS.map(([key, name]) =>
    '<button class="category' + (state.category === key ? ' selected' : '') + '" type="button" data-category="' +
    key + '" aria-pressed="' + (state.category === key) + '">' + text(name) + '</button>').join('');
}
function selectOptions<T extends string>(options: T[], selected: string, defaultLabel: string): string {
  return '<option value="all">' + defaultLabel + '</option>' +
    options.map(value => '<option value="' + text(value) + '"' + (value === selected ? ' selected' : '') + '>' + text(label(value)) + '</option>').join('');
}
function updateSelects() {
  const scope = entries.filter(item => state.category === 'all' || categoryOf(item) === state.category);
  const sub = [...new Set(scope.map(item => item.subcategory).filter(Boolean))].sort();
  const gens = [...new Set(scope.map(item => item.generation).filter(Boolean))].sort();
  if (state.subcategory !== 'all' && !sub.includes(state.subcategory)) state.subcategory = 'all';
  if (state.generation !== 'all' && !gens.includes(state.generation)) state.generation = 'all';
  $('type').innerHTML = selectOptions(sub, state.subcategory, 'All subcategories');
  $('generation').innerHTML = selectOptions(gens, state.generation, 'All generations');
}
function matches(): Entry[] {
  const words = state.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const selected = entries.filter(entry => {
    if (state.category !== 'all' && categoryOf(entry) !== state.category) return false;
    if (state.subcategory !== 'all' && entry.subcategory !== state.subcategory) return false;
    if (state.generation !== 'all' && entry.generation !== state.generation) return false;
    if (state.previewsOnly && !imageFor(entry)) return false;
    const haystack = [entry.title, entry.artist, entry.category_1, entry.category_2,
      entry.generation, entry.subcategory, entry.sheet, details[entry.source_url]?.excerpt || ''].join(' ').toLocaleLowerCase();
    return words.every(word => haystack.includes(word));
  });
  return selected.sort((a,b) => Number(Boolean(imageFor(b))) - Number(Boolean(imageFor(a))) || a.title.localeCompare(b.title));
}
function credits(entry: Entry): string {
  return entry.credits.includes('☆') ? 'Credit required' : 'Check usage terms';
}
function content(entry: Entry): string {
  const summary = details[entry.source_url]?.excerpt || '';
  return '<div class="entry-info"><button type="button" class="entry-title tile-trigger" data-entry="' +
    text(entry.id) + '">' + text(title(entry.title)) + '</button>' +
    '<span class="entry-artist">' + text(entry.artist) + '</span>' +
    (summary ? '<p class="entry-summary">' + text(summary) + '</p>' : '') + '</div>';
}
function actions(entry: Entry): string {
  const original = link(entry.source_url);
  return '<div class="entry-links">' +
    (original ? '<a href="' + text(original) + '" target="_blank" rel="noopener noreferrer">Source ↗</a>' : '') +
    '<a href="' + text(pathFor(entry)) + '" target="_blank" rel="noopener noreferrer">Files ↗</a></div>';
}
function row(entry: Entry): string {
  return '<article class="entry-row' + (imageFor(entry) ? ' with-preview' : '') + '">' +
    picture(entry) + content(entry) +
    '<div class="entry-details"><span>' + text(label(entry.subcategory || 'general')) +
    '</span><small>' + text(entry.generation || 'Not specified') + '</small></div>' +
    '<div class="entry-credit">' + text(credits(entry)) + '</div>' + actions(entry) + '</article>';
}
function card(entry: Entry): string {
  return '<article class="entry-card">' + picture(entry, true) +
    '<div class="card-body">' + content(entry) + '<div class="card-meta">' + text(label(entry.subcategory || 'general')) +
    (entry.generation ? ' · ' + text(entry.generation) : '') + '</div>' + actions(entry) + '</div></article>';
}
function updateUrl(): void {
  const next = new URLSearchParams();
  if (state.search) next.set('q', state.search);
  if (state.category !== 'all') next.set('category', state.category);
  if (state.subcategory !== 'all') next.set('type', state.subcategory);
  if (state.generation !== 'all') next.set('gen', state.generation);
  if (state.layout === 'grid') next.set('view', 'grid');
  if (state.previewsOnly) next.set('previews', '1');
  if (activeTile) next.set('tile', activeTile);
  history.replaceState(null, '', location.pathname + (next.size ? '?' + next.toString() : '') + location.hash);
}
function render(reset = false) {
  if (reset) state.page = 1;
  $('categories').innerHTML = categoryOptions();
  $('view-list').classList.toggle('selected', state.layout === 'list');
  $('view-grid').classList.toggle('selected', state.layout === 'grid');
  $('preview-filter').classList.toggle('selected', state.previewsOnly);
  $('preview-filter').setAttribute('aria-pressed', String(state.previewsOnly));
  const result = matches(), pageSize = 48, shown = result.slice(0, state.page * pageSize);
  $('result-count').textContent = result.length + ' result' + (result.length === 1 ? '' : 's');
  $('results').className = state.layout === 'grid' ? 'results grid' : 'results list';
  $('results').innerHTML = shown.length ? shown.map(state.layout === 'grid' ? card : row).join('') :
    '<div class="empty">No matches. Try a different search or category.</div>';
  $('load-more').hidden = shown.length >= result.length;
  updateUrl();
}
const app = $('app');
app.innerHTML = [
  '<div class="shell">',
  '<div class="banner"><img src="' + text(import.meta.env.BASE_URL + 'banner.png') + '" alt="Pokémon Ultimate Tileset Collection banner" /></div>',
  '<main><section class="intro">',
  '<p>Browse tilesets by artist, category and generation. This is an unofficial index; the original creators retain their artwork and usage rights.</p>',
  '<div class="intro-links">',
  '<a href="' + SHEET + '" target="_blank" rel="noopener noreferrer">Original spreadsheet ↗</a>',
  '<a href="' + REPO + '" target="_blank" rel="noopener noreferrer">GitHub ↗</a>',
  '</div></section>',
  '<section class="browser" aria-label="Browse tilesets">',
  '<aside class="sidebar"><div class="side-heading">Categories</div><div id="categories" class="categories"></div>',
  '<div class="aside-note">All credits and source links come from the original collection. Some previews are embedded from external image hosts.</div></aside>',
  '<div class="main-content"><div class="toolbar">',
  '<label class="search"><span class="visually-hidden">Search tilesets</span><input id="query" type="search" placeholder="Search titles and artists" value="' + text(state.search) + '"/></label>',
  '<div class="filters"><label>Subcategory<select id="type"></select></label><label>Generation<select id="generation"></select></label></div></div>',
  '<div class="result-tools"><div><strong id="result-count"></strong>',
  '<button id="preview-filter" class="preview-filter" type="button" aria-pressed="false">With previews (' + entries.filter(e => imageFor(e)).length + ')</button></div>',
  '<div class="view-tools">',
  '<div class="view-switch" role="group" aria-label="View"><button type="button" id="view-list" aria-label="List view">List</button>',
  '<button type="button" id="view-grid" aria-label="Grid view">Grid</button></div></div></div>',
  '<div id="results" class="results list"></div>',
  '<div class="load-more-wrap"><button id="load-more" type="button">Load more</button></div>',
  '</div></section></main>',
  '<dialog id="tile-dialog" class="tile-dialog" aria-label="Tileset details"></dialog>',
  '<footer><span>Unofficial readability fork</span>',
  '<a href="' + SHEET + '" target="_blank" rel="noopener noreferrer">' + text(COLLECTION) + ' ↗</a>',
  '<span>Artwork belongs to the original artists.</span></footer></div>'
].join('');
$('categories').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-category]');
  if (!button) return;
  state.category = button.dataset.category || 'all';
  state.subcategory = 'all'; state.generation = 'all';
  updateSelects(); render(true);
});
$<HTMLInputElement>('query').addEventListener('input', event => {
  state.search = (event.target as HTMLInputElement).value; render(true);
});
$<HTMLSelectElement>('type').addEventListener('change', event => {
  state.subcategory = (event.target as HTMLSelectElement).value; render(true);
});
$<HTMLSelectElement>('generation').addEventListener('change', event => {
  state.generation = (event.target as HTMLSelectElement).value; render(true);
});
$('view-list').addEventListener('click', () => { state.layout = 'list'; render(true); });
$('view-grid').addEventListener('click', () => { state.layout = 'grid'; render(true); });
$('preview-filter').addEventListener('click', () => { state.previewsOnly = !state.previewsOnly; render(true); });
$('load-more').addEventListener('click', () => { state.page++; render(); });
document.addEventListener('keydown', event => {
  if (event.key !== '/' || document.activeElement instanceof HTMLInputElement) return;
  event.preventDefault();
  $<HTMLInputElement>('query').focus();
});

const dialog = $<HTMLDialogElement>('tile-dialog');
function showTile(id: string): void {
  const entry = entries.find(item => item.id === id);
  if (!entry) return;
  activeTile = id;
  updateUrl();
  const extra = details[entry.source_url];
  const original = link(entry.source_url);
  dialog.innerHTML = '<div class="dialog-top"><span>Tileset details</span><button type="button" id="close-tile" aria-label="Close details">Close</button></div>' +
    picture(entry, true) +
    '<div class="dialog-body"><h2>' + text(title(entry.title)) + '</h2>' +
    '<p class="dialog-artist">By ' + text(entry.artist || 'Unknown artist') + '</p>' +
    (extra?.excerpt ? '<p class="dialog-description">' + text(extra.excerpt) + '</p>' : '') +
    '<dl><div><dt>Category</dt><dd>' + text(entry.sheet) + '</dd></div>' +
    '<div><dt>Type</dt><dd>' + text(label(entry.subcategory || 'general')) + '</dd></div>' +
    '<div><dt>Generation</dt><dd>' + text(entry.generation || 'Not specified') + '</dd></div>' +
    '<div><dt>Credit</dt><dd>' + text(credits(entry)) + '</dd></div></dl>' +
    '<p class="dialog-note">Check the artist page for usage conditions. Artwork belongs to its creator.</p>' +
    '<div class="dialog-actions">' +
    (original ? '<a href="' + text(original) + '" target="_blank" rel="noopener noreferrer">Original artwork ↗</a>' : '') +
    '<a href="' + text(pathFor(entry)) + '" target="_blank" rel="noopener noreferrer">Collection files ↗</a>' +
    '<a href="' + text(REPO + '/issues/new?template=preview.yml&source_url=' + encodeURIComponent(entry.source_url) +
      '&title=' + encodeURIComponent('Preview: ' + title(entry.title))) +
    '" target="_blank" rel="noopener noreferrer">Contribute a preview ↗</a></div></div>';
  if (!dialog.open) dialog.showModal();
  $('close-tile').addEventListener('click', () => dialog.close());
}
function hideBrokenImage(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLImageElement) || !target.classList.contains('preview-thumb')) return;
  target.closest('.entry-row')?.classList.remove('with-preview');
  target.remove();
}
$('results').addEventListener('error', hideBrokenImage, true);
dialog.addEventListener('error', hideBrokenImage, true);
$('results').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-entry]');
  if (button?.dataset.entry) showTile(button.dataset.entry);
});
dialog.addEventListener('close', () => {
  activeTile = '';
  updateUrl();
});
updateSelects();
render();
if (activeTile) showTile(activeTile);
