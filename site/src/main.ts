import catalog from '../../_catalog/catalog.json';
import './style.css';

type Entry = {
  id: string;
  title: string;
  artist: string;
  category_1: string;
  category_2: string;
  generation: string;
  source_platform: string;
  source_url: string;
  credits: string;
  sheet: string;
  folder: string;
  subcategory: string;
  preview_url?: string;
};
const REPO = 'https://github.com/mcmanussliam/pokemon-ultimate-tileset-collection';
const SHEET = 'https://docs.google.com/spreadsheets/d/1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8/edit?gid=0#gid=0';
const BANNER = 'https://raw.githubusercontent.com/mcmanussliam/pokemon-ultimate-tileset-collection/main/assets/banner.png';
const items: Entry[] = (catalog.entries as Entry[]).filter(e => !!e.folder && !!e.title);
const GROUPS: Array<[string, string]> = [
  ['outdoor-tilesets', 'Outdoor'],
  ['indoor-tilesets', 'Indoor'],
  ['indoor-outdoor-tilesets', 'Indoor + Outdoor'],
  ['misc-tilesets', 'Misc'],
  ['animated-tilesets', 'Animated'],
  ['auto-tilesets', 'Autotiles'],
  ['in-out-misc-etc', 'Collections'],
];
const labels = new Map(GROUPS);
const params = new URLSearchParams(location.search);
const filters = {
  query: params.get('q') || '',
  category: params.get('category') || 'all',
  subcategory: params.get('type') || 'all',
  generation: params.get('gen') || 'all',
  sort: params.get('sort') || 'featured',
  visible: 48,
};
const el = (selector: string) => document.querySelector<HTMLElement>(selector);
const enc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const safeUrl = (url: string): string => {
  try {
    const target = new URL(url);
    return ['https:', 'http:'].includes(target.protocol) ? target.href : '';
  } catch { return ''; }
};
const titleize = (text: string) => text.split('-').map(part => {
  if (/^(frlg|hgss|dpp?t|psdk)$/i.test(part)) return part.toUpperCase();
  return part.charAt(0).toUpperCase() + part.slice(1);
}).join(' ');
const cleanTitle = (title: string) => title.replace(/\s+on DeviantArt$/i, '')
  .replace(/\s*\|\s*Eevee Expo$/i, '').replace(/\s*-\s*The Spriters Resource$/i, '');
const groupFor = (entry: Entry) => entry.folder.split('/')[0];
const folderUrl = (entry: Entry) => REPO + '/tree/main/' +
  entry.folder.split('/').map(part => encodeURIComponent(part)).join('/');
const hasPreview = (entry: Entry) => !!safeUrl(entry.preview_url || '');

function tally(entries: Entry[]): string {
  return new Intl.NumberFormat('en-GB').format(entries.length);
}
function groupButtons(): string {
  const buttons = [['all', 'All', items.length] as const, ...GROUPS.map(([id, label]) =>
    [id, label, items.filter(item => groupFor(item) === id).length] as const)];
  return buttons.map(([id, label, count]) =>
    '<button class="group-pill' + (filters.category === id ? ' is-active' : '') +
    '" type="button" data-group="' + enc(id) + '" aria-pressed="' + (filters.category === id) +
    '">' + enc(label) + '<span>' + count + '</span></button>').join('');
}
const app = document.getElementById('app');
if (!app) throw new Error('Gallery container unavailable');
app.innerHTML = [
  '<div class="site-shell">',
  '<header class="nav"><a class="brand" href="./" aria-label="Tileset Atlas home">',
  '<span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>',
  '<span>Tileset <strong>Atlas</strong></span></a>',
  '<nav class="nav-links" aria-label="Main navigation">',
  '<a href="#browse">Browse</a><a href="' + SHEET + '" target="_blank" rel="noopener noreferrer">Original sheet <span aria-hidden="true">↗</span></a>',
  '<a class="nav-repo" href="' + REPO + '" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a></nav></header>',
  '<main>',
  '<section class="hero" aria-labelledby="hero-title">',
  '<div class="hero-body"><div class="eyebrow"><span class="signal"></span> THE COMMUNITY TILESET INDEX</div>',
  '<h1 id="hero-title">Every tile tells<br /><em>a story.</em></h1>',
  '<p>A better way to explore Pokémon-inspired tilesets. Discover creators, find the right environment, and jump straight to the original artwork.</p>',
  '<div class="hero-buttons"><a class="action-primary" href="#browse">Explore the collection <span aria-hidden="true">↓</span></a>',
  '<a class="action-ghost" href="' + SHEET + '" target="_blank" rel="noopener noreferrer">View original sheet ↗</a></div>',
  '<div class="hero-fine">Unofficial readability fork · All artwork belongs to its original creators.</div></div>',
  '<div class="hero-art" aria-label="Collection banner"><div class="art-caption"><span class="art-square"></span> COMMUNITY ARCHIVE <span>001 / 007</span></div>',
  '<img src="' + BANNER + '" alt="Pokémon Ultimate Tileset Collection banner" />',
  '<div class="art-bottom">FAN-MADE RESOURCES <span>◆</span> EXPLORE & CREDIT</div></div></section>',
  '<section class="stats" aria-label="Collection overview">',
  '<div class="stat"><strong>' + tally(items) + '</strong><span>TILESET ENTRIES</span></div>',
  '<div class="stat"><strong>' + GROUPS.length + '</strong><span>MAIN CATEGORIES</span></div>',
  '<div class="stat"><strong>' + new Set(items.map(e => e.artist.toLowerCase()).filter(Boolean)).size + '+</strong><span>CREATORS INDEXED</span></div>',
  '<div class="stat stat-last"><span class="stat-notice">✳</span><p>An archive for discovery.<br/>Always credit the artists.</p></div>',
  '</section>',
  '<section class="library" id="browse" aria-labelledby="browse-title">',
  '<div class="library-heading"><div><p class="section-kicker">THE LIBRARY / 01</p><h2 id="browse-title">Find your next <em>tileset.</em></h2></div>',
  '<p>Search the collection by name, artist, generation, or setting.</p></div>',
  '<div class="filter-bar"><label class="search-field" for="search">',
  '<span class="search-icon" aria-hidden="true">⌕</span><input type="search" id="search" placeholder="Search tilesets, artists, places..." autocomplete="off" aria-label="Search tilesets" value="' + enc(filters.query) + '" />',
  '<kbd>/</kbd></label>',
  '<label class="select-wrap">GENERATION <select id="generation" aria-label="Filter by generation"></select></label>',
  '<label class="select-wrap">SUBCATEGORY <select id="subcategory" aria-label="Filter by subcategory"></select></label>',
  '<label class="select-wrap">SORT BY <select id="sort" aria-label="Sort tilesets">',
  '<option value="featured">Previews first</option><option value="name">Name A–Z</option><option value="artist">Creator A–Z</option></select></label></div>',
  '<div class="category-scroll" id="groups" role="group" aria-label="Tileset categories"></div>',
  '<div class="results-header"><p id="result-count" role="status" aria-live="polite"></p><p id="preview-status"></p></div>',
  '<div class="tiles-grid" id="results" aria-label="Tileset search results"></div>',
  '<div class="more-actions"><button type="button" id="show-more" class="action-outline">Show more tilesets <span aria-hidden="true">↓</span></button></div>',
  '</section>',
  '</main>',
  '<footer class="footer"><div class="footer-logo">◆ <strong>TILESET ATLAS</strong><span>Independent community index</span></div>',
  '<p>This site simply reorganises the <a href="' + SHEET + '">original spreadsheet</a> for easier browsing. Artist rights and original terms apply. Some artwork previews are linked directly from their creator\'s pages; no permission to redistribute is implied.</p>',
  '<div class="footer-links"><a href="' + REPO + '">Repository ↗</a><a href="' + SHEET + '">Source spreadsheet ↗</a></div></footer>',
  '</div>'
].join('');

const groups = el('#groups')!;
const results = el('#results')!;
const countText = el('#result-count')!;
const previewText = el('#preview-status')!;
const searchInput = document.getElementById('search') as HTMLInputElement;
const genSelect = document.getElementById('generation') as HTMLSelectElement;
const subSelect = document.getElementById('subcategory') as HTMLSelectElement;
const sortSelect = document.getElementById('sort') as HTMLSelectElement;
const moreButton = document.getElementById('show-more') as HTMLButtonElement;

function options(select: HTMLSelectElement, values: string[], selected: string, allLabel: string) {
  const list = ['<option value="all">' + enc(allLabel) + '</option>',
    ...values.map(value => '<option value="' + enc(value) + '">' + enc(titleize(value)) + '</option>')];
  select.innerHTML = list.join('');
  select.value = selected;
  if (select.selectedIndex < 0) { select.value = 'all'; }
}
function currentSubset(): Entry[] {
  return items.filter(entry => filters.category === 'all' || groupFor(entry) === filters.category);
}
function refreshOptions(): void {
  const subset = currentSubset();
  const subs = [...new Set(subset.map(e => e.subcategory).filter(Boolean))].sort();
  const gens = [...new Set(subset.map(e => e.generation).filter(Boolean))].sort();
  options(subSelect, subs, filters.subcategory, 'All subcategories');
  options(genSelect, gens, filters.generation, 'All generations');
  filters.subcategory = subSelect.value;
  filters.generation = genSelect.value;
  sortSelect.value = filters.sort;
}
function filteredItems(): Entry[] {
  const q = filters.query.toLocaleLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);
  const found = currentSubset().filter(entry => {
    if (filters.subcategory !== 'all' && entry.subcategory !== filters.subcategory) return false;
    if (filters.generation !== 'all' && entry.generation !== filters.generation) return false;
    if (!words.length) return true;
    const haystack = [entry.title, entry.artist, entry.generation, entry.category_1,
      entry.category_2, entry.source_platform, entry.sheet, entry.subcategory].join(' ').toLocaleLowerCase();
    return words.every(word => haystack.includes(word));
  });
  found.sort((a,b) => {
    if (filters.sort === 'artist') return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
    if (filters.sort === 'name') return a.title.localeCompare(b.title);
    return Number(hasPreview(b)) - Number(hasPreview(a)) || a.title.localeCompare(b.title);
  });
  return found;
}
function card(entry: Entry, index: number): string {
  const variant = ['forest', 'lake', 'sand', 'dusk', 'rock'][Math.abs(hash(entry.subcategory)) % 5];
  const source = safeUrl(entry.source_url);
  const preview = safeUrl(entry.preview_url || '');
  const fallback = '<div class="placeholder-world" aria-hidden="true"><span class="world-sun"></span><span class="world-mountain one"></span><span class="world-mountain two"></span><span class="world-ground"></span><span class="world-grass"></span></div>';
  const media = preview
    ? '<img class="tile-preview" loading="lazy" decoding="async" src="' + enc(preview) +
      '" alt="Source-hosted preview for ' + enc(entry.title) + '" />' + fallback
    : fallback;
  const flag = preview ? '<span class="image-flag">SOURCE PREVIEW</span>' : '<span class="image-flag image-flag--empty">PREVIEW UNAVAILABLE</span>';
  const label = labels.get(groupFor(entry)) || entry.sheet;
  const credit = entry.credits.includes('☆') ? 'Credit required' : 'Check creator terms';
  return [
    '<article class="tile-card tile-card--' + variant + '" style="--stagger:' + Math.min(index,12) + '">',
    '<div class="tile-media">' + media + '<span class="tile-index">' + String(index+1).padStart(3,'0') + '</span>' + flag + '</div>',
    '<div class="tile-content"><div class="card-topline"><span>' + enc(label.toUpperCase()) + '</span><span>◆</span></div>',
    '<h3>' + enc(cleanTitle(entry.title)) + '</h3>',
    '<p class="byline">by <strong>' + enc(entry.artist || 'Unknown creator') + '</strong></p>',
    '<div class="tile-tags"><span>' + enc(titleize(entry.subcategory || 'general')) + '</span>' +
    (entry.generation ? '<span>' + enc(entry.generation) + '</span>' : '') + '</div>',
    '<p class="usage-note">' + enc(credit) + ' · Non-commercial per source sheet</p>',
    '<div class="tile-actions">',
    (source ? '<a href="' + enc(source) + '" target="_blank" rel="noopener noreferrer" class="source-link" aria-label="View original source for ' + enc(entry.title) + '">Original artwork <span aria-hidden="true">↗</span></a>' :
      '<span class="source-link source-disabled">Source in spreadsheet</span>'),
    '<a class="folder-link" href="' + enc(folderUrl(entry)) + '" target="_blank" rel="noopener noreferrer" aria-label="View GitHub folder for ' + enc(entry.title) + '" title="View folder on GitHub">⌁</a>',
    '</div></div></article>'
  ].join('');
}
function hash(str: string): number {
  let h = 0;
  for (const char of str) h = ((h << 5) - h + char.charCodeAt(0)) | 0;
  return h;
}
function syncQuery(): void {
  const p = new URLSearchParams();
  if (filters.query) p.set('q', filters.query);
  if (filters.category !== 'all') p.set('category', filters.category);
  if (filters.subcategory !== 'all') p.set('type', filters.subcategory);
  if (filters.generation !== 'all') p.set('gen', filters.generation);
  if (filters.sort !== 'featured') p.set('sort', filters.sort);
  const url = location.pathname + (p.size ? '?' + p.toString() : '') + location.hash;
  history.replaceState(null, '', url);
}
function render(): void {
  groups.innerHTML = groupButtons();
  const found = filteredItems();
  const shown = found.slice(0, filters.visible);
  countText.innerHTML = '<strong>' + tally(found) + '</strong> tileset' + (found.length === 1 ? '' : 's') + ' found' +
    (found.length > shown.length ? ' <span>· Showing ' + shown.length + '</span>' : '');
  const withImages = found.filter(hasPreview).length;
  previewText.textContent = withImages + ' source-hosted previews · Not all entries have images';
  results.innerHTML = shown.length ? shown.map(card).join('') :
    '<div class="empty-state"><span>◇</span><h3>No tilesets found</h3><p>Try a broader search or clear the filters.</p>' +
    '<button type="button" id="clear-filters">Clear filters</button></div>';
  moreButton.hidden = found.length <= shown.length;
  syncQuery();
}
function resetPage(): void { filters.visible = 48; render(); }
groups.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-group]');
  if (!target) return;
  filters.category = target.dataset.group || 'all';
  filters.subcategory = 'all';
  filters.generation = 'all';
  refreshOptions();
  resetPage();
});
searchInput.addEventListener('input', () => { filters.query = searchInput.value; resetPage(); });
genSelect.addEventListener('change', () => { filters.generation = genSelect.value; resetPage(); });
subSelect.addEventListener('change', () => { filters.subcategory = subSelect.value; resetPage(); });
sortSelect.addEventListener('change', () => { filters.sort = sortSelect.value; resetPage(); });
moreButton.addEventListener('click', () => { filters.visible += 48; render(); });
results.addEventListener('click', event => {
  if (!(event.target as HTMLElement).closest('#clear-filters')) return;
  filters.query = ''; filters.category = 'all'; filters.subcategory = 'all'; filters.generation = 'all';
  searchInput.value = '';
  refreshOptions();
  resetPage();
});
document.addEventListener('error', event => {
  const target = event.target;
  if (target instanceof HTMLImageElement && target.classList.contains('tile-preview')) {
    target.style.display = 'none';
    const flag = target.parentElement?.querySelector('.image-flag');
    if (flag) flag.textContent = 'PREVIEW UNAVAILABLE';
  }
}, true);
document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== searchInput &&
      !(document.activeElement instanceof HTMLInputElement)) {
    event.preventDefault(); searchInput.focus();
  }
  if (event.key === 'Escape' && document.activeElement === searchInput) searchInput.blur();
});
refreshOptions();
render();
