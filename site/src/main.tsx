import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownAZ,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderOpen,
  Grid2X2,
  ImageOff,
  Images,
  Layers,
  List,
  Search,
  SlidersHorizontal,
  Trees,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  categoryOf,
  cleanTitle,
  credit,
  defaults,
  details,
  entries,
  filterQuery,
  folderLink,
  GROUPS,
  label,
  previews,
  readFilters,
  REPO,
  results,
  safeLink,
  SHEET,
  syncedAt,
  type Entry,
  type Filters,
} from "@/lib/catalog";
import "./style.css";

const withPreview = entries.filter((e) => previews[e.source_url]).length;
const artists = [
  ...new Set(entries.map((e) => e.artist).filter(Boolean)),
].sort();
const options = (list: string[]) => [...new Set(list.filter(Boolean))].sort();
function Filter({
  name,
  value,
  onChange,
  items,
  all,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  items: string[];
  all: string;
}) {
  return (
    <label className="filter-field">
      <span>{name}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={name}>
          <SelectValue placeholder={all} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{all}</SelectItem>
          {items.map((item) => (
            <SelectItem value={item} key={item}>
              {name === "Artist" ? item : label(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
function Artwork({
  entry,
  large = false,
  zoom = 0,
  background = "checker",
}: {
  entry: Entry;
  large?: boolean;
  zoom?: number;
  background?: string;
}) {
  const preview = previews[entry.source_url];
  const [failed, setFailed] = useState(false);
  if (!preview || failed)
    return (
      <div className={"artwork-empty " + (large ? "large" : "")}>
        <ImageOff size={large ? 32 : 24} />
        <span>{failed ? "Preview could not load" : "No preview yet"}</span>
        {large && <small>Open the original source to view this tileset.</small>}
      </div>
    );
  return (
    <div
      className={
        "artwork " +
        (large ? "artwork-large " : "") +
        "bg-" +
        background +
        (zoom ? " zoomed" : "")
      }
    >
      <img
        src={import.meta.env.BASE_URL + preview.file}
        alt={cleanTitle(entry.title) + " — artwork by " + entry.artist}
        loading={large ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        style={
          zoom
            ? {
                width: preview.width * zoom,
                maxWidth: "none",
                maxHeight: "none",
              }
            : undefined
        }
      />
    </div>
  );
}
function TileCard({
  entry,
  onOpen,
  layout,
}: {
  entry: Entry;
  onOpen: (e: Entry) => void;
  layout: string;
}) {
  return (
    <Card className={"tile-card " + layout}>
      <button
        className="artwork-trigger"
        onClick={() => onOpen(entry)}
        aria-label={"Preview " + cleanTitle(entry.title)}
      >
        <Artwork entry={entry} />
        {previews[entry.source_url] && (
          <span className="preview-corner">
            <ZoomIn size={14} /> Preview
          </span>
        )}
      </button>
      <CardContent className="tile-content">
        <div className="tile-badges">
          <Badge variant="secondary">{label(entry.subcategory)}</Badge>
          {entry.generation && <span>{entry.generation}</span>}
        </div>
        <h3>
          <button onClick={() => onOpen(entry)}>
            {cleanTitle(entry.title)}
          </button>
        </h3>
        <p className="artist">
          by{" "}
          <button onClick={() => onOpen(entry)}>
            {entry.artist || "Unknown artist"}
          </button>
        </p>
        <div className="tile-bottom">
          <span>{credit(entry)}</span>
          {safeLink(entry.source_url) && (
            <a
              href={safeLink(entry.source_url)}
              target="_blank"
              rel="noreferrer"
            >
              Source <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
function TileDetails({
  entry,
  onClose,
  restoreFocus,
}: {
  entry: Entry | null;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const [zoom, setZoom] = useState(0);
  const [background, setBackground] = useState("checker");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (entry) {
      setZoom(0);
      setBackground("checker");
      setCopied(false);
    }
  }, [entry]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Dialog
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="detail-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        {entry && (
          <>
            <DialogHeader>
              <div className="eyebrow">
                {entry.sheet} <ChevronRight size={12} />{" "}
                {label(entry.subcategory)}
              </div>
              <DialogTitle>{cleanTitle(entry.title)}</DialogTitle>
              <DialogDescription>
                Artwork by {entry.artist || "Unknown artist"}
              </DialogDescription>
            </DialogHeader>
            <div className="detail-layout">
              <div className="preview-panel">
                <div className="preview-tools">
                  <span>
                    {previews[entry.source_url]
                      ? previews[entry.source_url].kind === "resource_thumbnail"
                        ? "Source thumbnail"
                        : "Artwork preview"
                      : "Preview unavailable"}
                  </span>
                  {previews[entry.source_url] && (
                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setZoom(0)}
                        aria-pressed={zoom === 0}
                      >
                        Fit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Zoom out"
                        disabled={zoom === 0}
                        onClick={() => setZoom((z) => (z <= 1 ? 0 : z - 1))}
                      >
                        <ZoomOut />
                      </Button>
                      <span>{zoom ? zoom + "×" : "Auto"}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Zoom in"
                        disabled={zoom >= 4}
                        onClick={() => setZoom((z) => z + 1)}
                      >
                        <ZoomIn />
                      </Button>
                    </div>
                  )}
                </div>
                <Artwork
                  key={entry.folder}
                  entry={entry}
                  large
                  zoom={zoom}
                  background={background}
                />
                {previews[entry.source_url] && (
                  <div className="preview-caption">
                    <span>
                      {previews[entry.source_url].width} ×{" "}
                      {previews[entry.source_url].height} px ·{" "}
                      {previews[entry.source_url].kind === "resource_thumbnail"
                        ? "Source thumbnail"
                        : "Local preview"}
                    </span>
                    <label>
                      Background{" "}
                      <select
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        aria-label="Preview background"
                      >
                        <option value="checker">Checkerboard</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
              <aside className="detail-info">
                {details[entry.source_url]?.excerpt && (
                  <p className="excerpt">{details[entry.source_url].excerpt}</p>
                )}
                <dl>
                  <div>
                    <dt>Artist / submitter</dt>
                    <dd>{entry.artist || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt>Generation</dt>
                    <dd>{entry.generation || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{entry.source_platform || "Original creator"}</dd>
                  </div>
                  <div>
                    <dt>Attribution</dt>
                    <dd>{credit(entry)}</dd>
                  </div>
                </dl>
                <p className="usage-note">
                  The collection lists noncommercial resources. Check the
                  creator’s source for the full usage and credit terms.
                </p>
                {safeLink(entry.source_url) && (
                  <Button asChild className="source-button">
                    <a
                      href={safeLink(entry.source_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open original source <ExternalLink size={15} />
                    </a>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <a href={folderLink(entry)} target="_blank" rel="noreferrer">
                    <FolderOpen size={16} /> Collection entry
                  </a>
                </Button>
                {previews[entry.source_url] && (
                  <Button asChild variant="outline">
                    <a
                      href={
                        import.meta.env.BASE_URL +
                        previews[entry.source_url].file
                      }
                      download
                    >
                      <Images size={16} /> Download preview
                    </a>
                  </Button>
                )}
                <Button variant="ghost" onClick={copy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                  {copied ? "Link copied" : "Copy entry link"}
                </Button>
              </aside>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
function App() {
  const [filters, setFilters] = useState(() => readFilters(location.search));
  const [count, setCount] = useState(36);
  const [active, setActive] = useState<Entry | null>(() => {
    const id = new URLSearchParams(location.search).get("tile");
    return entries.find((e) => e.folder === id || e.id === id) || null;
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const openEntry = (entry: Entry) => {
    openerRef.current = document.activeElement as HTMLElement;
    setActive(entry);
  };
  const found = useMemo(() => results(filters), [filters]);
  const scope = entries.filter(
    (e) => filters.category === "all" || categoryOf(e) === filters.category,
  );
  const set = (key: keyof Filters, value: string) => {
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "category"
        ? { subcategory: "all", generation: "all", artist: "all" }
        : {}),
    }));
    setCount(36);
  };
  useEffect(() => {
    const q = filterQuery(filters, active?.folder);
    history.replaceState(
      null,
      "",
      location.pathname + (q ? "?" + q : "") + location.hash,
    );
  }, [filters, active]);
  useEffect(() => {
    const listener = () => {
      setFilters(readFilters(location.search));
      const tile = new URLSearchParams(location.search).get("tile");
      setActive(
        entries.find((e) => e.folder === tile || e.id === tile) || null,
      );
      setCount(36);
    };
    const shortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !active &&
        !target.closest(
          'input,textarea,select,[contenteditable="true"],[role="combobox"]',
        )
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("popstate", listener);
    document.addEventListener("keydown", shortcut);
    return () => {
      window.removeEventListener("popstate", listener);
      document.removeEventListener("keydown", shortcut);
    };
  }, [active]);
  const clear = () => {
    setFilters((f) => ({ ...defaults, layout: f.layout }));
    setCount(36);
  };
  const changed = Object.keys(defaults).some(
    (k) =>
      !["sort", "layout"].includes(k) &&
      filters[k as keyof Filters] !== defaults[k as keyof Filters],
  );
  return (
    <>
      <a href="#collection" className="skip-link">
        Skip to collection
      </a>
      <header className="site-header">
        <a className="brand" href={import.meta.env.BASE_URL}>
          <span className="brand-icon">
            <Layers size={21} />
          </span>
          <span>
            ULTIMATE TILESET
            <span className="brand-sub">THE COMMUNITY COLLECTION</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href={SHEET} target="_blank" rel="noreferrer">
            Original spreadsheet <ArrowUpRight size={14} />
          </a>
          <Button variant="outline" size="sm" asChild>
            <a href={REPO} target="_blank" rel="noreferrer">
              GitHub <ArrowUpRight size={14} />
            </a>
          </Button>
        </nav>
      </header>
      <main className="page-shell">
        <section className="hero">
          <div>
            <div className="eyebrow">
              <span className="status-dot" /> A world of possibilities, one tile
              at a time
            </div>
            <h1>
              Your next world
              <br />
              starts <em>here.</em>
            </h1>
            <p>
              Explore the Pokémon Ultimate Tileset Collection.
              <br className="desktop-break" /> Find the right textures,
              buildings, and little details for your next adventure.
            </p>
            <a className="browse-link" href="#collection">
              Explore the collection <span>↓</span>
            </a>
          </div>
          <div className="hero-art">
            <img
              src={import.meta.env.BASE_URL + "banner.png"}
              alt="Original Ultimate Tileset Collection version 5.0.0 banner"
            />
            <span>Made by artists. Collected for creators.</span>
          </div>
        </section>
        <section className="collection-stats" aria-label="Collection overview">
          <div>
            <Layers />
            <strong>{entries.length}</strong>
            <span>Tilesets to explore</span>
          </div>
          <div>
            <Users />
            <strong>{artists.length}</strong>
            <span>Artists & submitters</span>
          </div>
          <div>
            <Images />
            <strong>{withPreview}</strong>
            <span>Entries with local previews</span>
          </div>
          <a
            href={REPO + "/blob/main/_catalog/preview-report.json"}
            target="_blank"
            rel="noreferrer"
          >
            Preview coverage <ArrowUpRight size={14} />
          </a>
        </section>
        <section id="collection" className="collection">
          <aside className="sidebar">
            <div className="sidebar-heading">THE COLLECTION</div>
            <nav aria-label="Tileset categories">
              {GROUPS.map(([id, name], i) => (
                <Button
                  variant="ghost"
                  className={
                    "category " +
                    (filters.category === id ? "category-active" : "")
                  }
                  onClick={() => set("category", id)}
                  aria-pressed={filters.category === id}
                  key={id}
                >
                  {i === 0 ? (
                    <Grid2X2 size={17} />
                  ) : i === 1 ? (
                    <Trees size={17} />
                  ) : (
                    <Layers size={17} />
                  )}
                  <span>{name}</span>
                  <small>
                    {id === "all"
                      ? entries.length
                      : entries.filter((e) => categoryOf(e) === id).length}
                  </small>
                </Button>
              ))}
            </nav>
            <div className="sidebar-note">
              <Images size={20} />
              <h3>See what you’re building.</h3>
              <p>
                Downloaded previews live with the collection. More are added as
                sources become available.
              </p>
              <a
                href={REPO + "/blob/main/docs/previews.md"}
                target="_blank"
                rel="noreferrer"
              >
                About previews <ArrowUpRight size={13} />
              </a>
            </div>
          </aside>
          <div className="collection-main">
            <div className="section-top">
              <div className="section-title">
                <h2>{GROUPS.find(([id]) => id === filters.category)?.[1]}</h2>
                <p>Find a little inspiration for your next map.</p>
              </div>
              <Badge variant="outline">Community curated</Badge>
            </div>
            <div className="search-wrap">
              <Search size={19} />
              <Input
                type="search"
                ref={searchRef}
                aria-label="Search tilesets"
                placeholder="Search tilesets, artists, or a detail like ‘forest’…"
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
              />
              <kbd>/</kbd>
            </div>
            <div className="filter-row">
              <Filter
                name="Type"
                all="All types"
                value={filters.subcategory}
                items={options(scope.map((e) => e.subcategory))}
                onChange={(v) => set("subcategory", v)}
              />
              <Filter
                name="Generation"
                all="All generations"
                value={filters.generation}
                items={options(scope.map((e) => e.generation))}
                onChange={(v) => set("generation", v)}
              />
              <Filter
                name="Artist"
                all="All artists"
                value={filters.artist}
                items={options(scope.map((e) => e.artist))}
                onChange={(v) => set("artist", v)}
              />
              <label className="filter-field">
                <span>Images</span>
                <Select
                  value={filters.preview}
                  onValueChange={(v) => set("preview", v)}
                >
                  <SelectTrigger aria-label="Images">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entries</SelectItem>
                    <SelectItem value="available">With previews</SelectItem>
                    <SelectItem value="missing">Missing previews</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
            {changed && (
              <div className="active-filters">
                <SlidersHorizontal size={14} />
                <span>Filters applied</span>
                <Button size="sm" variant="ghost" onClick={clear}>
                  Clear filters <X size={13} />
                </Button>
              </div>
            )}
            <div className="results-toolbar">
              <p role="status">
                <strong>{found.length}</strong>{" "}
                {found.length === 1 ? "tileset" : "tilesets"}
                <span> · Showing {Math.min(count, found.length)}</span>
              </p>
              <div className="result-controls">
                <Select
                  value={filters.sort}
                  onValueChange={(v) => set("sort", v)}
                >
                  <SelectTrigger
                    aria-label="Sort tilesets"
                    className="sort-select"
                  >
                    <ArrowDownAZ size={15} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Previews first</SelectItem>
                    <SelectItem value="title">Title A–Z</SelectItem>
                    <SelectItem value="artist">Artist A–Z</SelectItem>
                  </SelectContent>
                </Select>
                <div
                  className="layout-switch"
                  role="group"
                  aria-label="Result layout"
                >
                  <Button
                    size="icon"
                    variant={filters.layout === "grid" ? "secondary" : "ghost"}
                    aria-label="Grid view"
                    aria-pressed={filters.layout === "grid"}
                    onClick={() => set("layout", "grid")}
                  >
                    <Grid2X2 size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant={filters.layout === "list" ? "secondary" : "ghost"}
                    aria-label="List view"
                    aria-pressed={filters.layout === "list"}
                    onClick={() => set("layout", "list")}
                  >
                    <List size={17} />
                  </Button>
                </div>
              </div>
            </div>
            {found.length ? (
              <div className={"tiles tiles-" + filters.layout}>
                {found.slice(0, count).map((entry) => (
                  <TileCard
                    key={entry.folder}
                    entry={entry}
                    onOpen={openEntry}
                    layout={filters.layout}
                  />
                ))}
              </div>
            ) : (
              <div className="no-results">
                <Search size={28} />
                <h3>No tilesets found</h3>
                <p>Try a different keyword or clear your filters.</p>
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              </div>
            )}
            {count < found.length && (
              <div className="load-more">
                <Button
                  variant="outline"
                  onClick={() => setCount((n) => n + 36)}
                >
                  Load more tilesets{" "}
                  <span>({found.length - count} remaining)</span>
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
      <footer>
        <span>
          <Layers size={16} /> Pokémon Ultimate Tileset Collection
        </span>
        <p>Unofficial index · Artwork belongs to its original artists.</p>
        <span>
          Catalogue synced{" "}
          {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
            new Date(syncedAt),
          )}
        </span>
      </footer>
      <TileDetails
        entry={active}
        onClose={() => setActive(null)}
        restoreFocus={() => {
          if (openerRef.current?.isConnected) openerRef.current.focus();
          else searchRef.current?.focus();
        }}
      />
    </>
  );
}
createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
