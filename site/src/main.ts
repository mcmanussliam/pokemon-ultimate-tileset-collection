import catalog from '../../_catalog/catalog.json';
import previewManifest from '../public/previews/manifest.json';
import './style.css';

type Entry = {
  id: string; title: string; artist: string; category_1: string; category_2: string;
  generation: string; source_url: string; credits: string; sheet: string;
  folder: string; subcategory: string;
};
type Preview = { file: string; source: string; generated_at: string };
const entries = catalog.entries as unknown as Entry[];
const previews: Record<string, Preview> = previewManifest as Record<string, Preview>;
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
  onlyImages: params.get('images') === '1',
  layout: params.get('view') === 'grid' ? 'grid' : 'list',
  page: 1,
};
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
function categoryOf(entry: Entry): string { return entry.folder.split('/')[0]; }
function pathFor(entry: Entry): string {
  return REPO + '/tree/main/' + entry.folder.split('/').map(encodeURIComponent).join('/');
}
function previewOf(entry: Entry): string {
  const file = previews[entry.folder]?.file || '';
  if (!/^[a-z0-9][a-z0-9._-]*\.webp$/.test(file)) return '';
  return import.meta.env.BASE_URL + 'previews/' + file;
}
function media(entry: Entry, large = false): string {
  const src = previewOf(entry);
  if (src) return '<div class="media has-image' + (large ? ' media-large' : '') + '"><img loading="lazy" decoding="async" src="' +
    text(src) + '" alt="Preview of ' + text(title(entry.title)) + '" /></div>';
  return '<div class="media media-empty' + (large ? ' media-large' : '') + '" aria-label="No preview available"><span>Image unavailable</span></div>';
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
    if (state.onlyImages && !previewOf(entry)) return false;
    const haystack = [entry.title, entry.artist, entry.category_1, entry.category_2,
      entry.generation, entry.subcategory, entry.sheet].join(' ').toLocaleLowerCase();
    return words.every(word => haystack.includes(word));
  });
  return selected.sort((a,b) =>
    (Number(!!previewOf(b)) - Number(!!previewOf(a))) ||
    a.title.localeCompare(b.title));
}
function credits(entry: Entry): string {
  return entry.credits.includes('☆') ? 'Credit required' : 'Check usage terms';
}
function content(entry: Entry): string {
  return '<div class="entry-info"><a class="entry-title" href="' + text(link(entry.source_url) || pathFor(entry)) +
    '" rel="noopener noreferrer" target="_blank">' + text(title(entry.title)) + '</a>' +
    '<span class="entry-artist">' + text(entry.artist) + '</span></div>';
}
function actions(entry: Entry): string {
  const original = link(entry.source_url);
  return '<div class="entry-links">' +
    (original ? '<a href="' + text(original) + '" target="_blank" rel="noopener noreferrer">Source ↗</a>' : '') +
    '<a href="' + text(pathFor(entry)) + '" target="_blank" rel="noopener noreferrer">Files ↗</a></div>';
}
function row(entry: Entry): string {
  return '<article class="entry-row">' + media(entry) + content(entry) +
    '<div class="entry-details"><span>' + text(label(entry.subcategory || 'general')) +
    '</span><small>' + text(entry.generation || 'Not specified') + '</small></div>' +
    '<div class="entry-credit">' + text(credits(entry)) + '</div>' + actions(entry) + '</article>';
}
function card(entry: Entry): string {
  return '<article class="entry-card">' + media(entry, true) +
    '<div class="card-body">' + content(entry) + '<div class="card-meta">' + text(label(entry.subcategory || 'general')) +
    (entry.generation ? ' · ' + text(entry.generation) : '') + '</div>' + actions(entry) + '</div></article>';
}
function updateUrl(): void {
  const next = new URLSearchParams();
  if (state.search) next.set('q', state.search);
  if (state.category !== 'all') next.set('category', state.category);
  if (state.subcategory !== 'all') next.set('type', state.subcategory);
  if (state.generation !== 'all') next.set('gen', state.generation);
  if (state.onlyImages) next.set('images', '1');
  if (state.layout === 'grid') next.set('view', 'grid');
  history.replaceState(null, '', location.pathname + (next.size ? '?' + next.toString() : '') + location.hash);
}
function render(reset = false) {
  if (reset) state.page = 1;
  $('categories').innerHTML = categoryOptions();
  $('view-list').classList.toggle('selected', state.layout === 'list');
  $('view-grid').classList.toggle('selected', state.layout === 'grid');
  ($<HTMLInputElement>('with-images')).checked = state.onlyImages;
  const result = matches(), pageSize = 48, shown = result.slice(0, state.page * pageSize);
  $('result-count').textContent = result.length + ' result' + (result.length === 1 ? '' : 's');
  $('results').className = state.layout === 'grid' ? 'results grid' : 'results list';
  $('results').innerHTML = shown.length ? shown.map(state.layout === 'grid' ? card : row).join('') :
    '<div class="empty">No matches. Try a different search or category.</div>';
  $('load-more').hidden = shown.length >= result.length;
  $('preview-note').textContent = Object.keys(previews).length +
    ' locally generated preview' + (Object.keys(previews).length === 1 ? '' : 's') + ' available';
  updateUrl();
}
const app = $('app');
app.innerHTML = [
  '<div class="shell">',
  '<header class="topbar">',
  '<nav aria-label="Main"><a href="' + SHEET + '" target="_blank" rel="noopener noreferrer">Original spreadsheet ↗</a>',
  '<a href="' + REPO + '" target="_blank" rel="noopener noreferrer">GitHub ↗</a></nav></header>',
  '<div class="banner"><img src="' + text(import.meta.env.BASE_URL + 'banner.png') + '" alt="Pokémon Ultimate Tileset Collection banner" /></div>',
  '<main><section class="intro">',
  '<p>Browse tilesets by artist, category and generation. Explore the <a href="' + SHEET + '" target="_blank" rel="noopener noreferrer">original spreadsheet</a>. ',
  'This is an unofficial index; the original creators retain their artwork and usage rights.</p></section>',
  '<section class="browser" aria-label="Browse tilesets">',
  '<aside class="sidebar"><div class="side-heading">Categories</div><div id="categories" class="categories"></div>',
  '<div class="aside-note">All credits and source links come from the original collection.</div></aside>',
  '<div class="main-content"><div class="toolbar">',
  '<label class="search"><span class="visually-hidden">Search tilesets</span><input id="query" type="search" placeholder="Search titles and artists" value="' + text(state.search) + '"/></label>',
  '<div class="filters"><label>Subcategory<select id="type"></select></label><label>Generation<select id="generation"></select></label></div></div>',
  '<div class="result-tools"><div><strong id="result-count"></strong><span class="preview-note" id="preview-note"></span></div>',
  '<div class="view-tools"><label class="image-filter"><input id="with-images" type="checkbox"/> Has preview</label>',
  '<div class="view-switch" role="group" aria-label="View"><button type="button" id="view-list" aria-label="List view">List</button>',
  '<button type="button" id="view-grid" aria-label="Grid view">Grid</button></div></div></div>',
  '<div id="results" class="results list"></div>',
  '<div class="load-more-wrap"><button id="load-more" type="button">Load more</button></div>',
  '</div></section></main><footer><span>Unofficial readability fork</span>',
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
$<HTMLInputElement>('with-images').addEventListener('change', event => {
  state.onlyImages = (event.target as HTMLInputElement).checked; render(true);
});
$('view-list').addEventListener('click', () => { state.layout = 'list'; render(true); });
$('view-grid').addEventListener('click', () => { state.layout = 'grid'; render(true); });
$('load-more').addEventListener('click', () => { state.page++; render(); });
document.addEventListener('keydown', event => {
  if (event.key !== '/' || document.activeElement instanceof HTMLInputElement) return;
  event.preventDefault();
  $<HTMLInputElement>('query').focus();
});
updateSelects();
render();
