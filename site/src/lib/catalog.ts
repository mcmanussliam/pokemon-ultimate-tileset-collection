import catalog from "../../../_catalog/catalog.json";
import enrichment from "../../../_catalog/enrichment.json";
export type Entry = (typeof catalog.entries)[number];
export type Extra = {
  excerpt?: string;
  source_title?: string;
  status?: string;
};
export const entries: Entry[] = catalog.entries;
export const details = enrichment as Record<string, Extra>;
export const syncedAt = catalog.last_synced;
export const REPO =
  "https://github.com/mcmanussliam/pokemon-ultimate-tileset-collection";
export const SHEET = catalog.source_spreadsheet;
export const GROUPS = [
  ["all", "All tilesets"],
  ["outdoor-tilesets", "Outdoor"],
  ["indoor-tilesets", "Indoor"],
  ["indoor-outdoor-tilesets", "Indoor + outdoor"],
  ["misc-tilesets", "Miscellaneous"],
  ["animated-tilesets", "Animated"],
  ["auto-tilesets", "Autotiles"],
  ["in-out-misc-etc", "Collections"],
] as const;
export const categoryOf = (e: Entry) => e.folder.split("/")[1];
export const label = (s: string) =>
  s
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bFrlg\b/g, "FRLG")
    .replace(/\bHgss\b/g, "HGSS");
export const cleanTitle = (s: string) =>
  s
    .replace(/ on DeviantArt$/i, "")
    .replace(/\s*\|\s*Eevee Expo$/i, "")
    .replace(/ - The Spriters Resource$/i, "");
export function safeLink(s: string) {
  try {
    const u = new URL(s);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export const folderLink = (e: Entry) =>
  REPO + "/tree/main/" + e.folder.split("/").map(encodeURIComponent).join("/");
export const credit = (e: Entry) =>
  e.credits.includes("☆")
    ? "Credit required"
    : e.credits.includes("❉")
      ? "See creator terms"
      : "Check usage terms";
export type Filters = {
  search: string;
  category: string;
  subcategory: string;
  generation: string;
  artist: string;
  sort: string;
  layout: string;
};
export const defaults: Filters = {
  search: "",
  category: "all",
  subcategory: "all",
  generation: "all",
  artist: "all",
  sort: "title",
  layout: "grid",
};
const keys: Record<keyof Filters, string> = {
  search: "q",
  category: "category",
  subcategory: "type",
  generation: "gen",
  artist: "artist",
  sort: "sort",
  layout: "view",
};
export function readFilters(search: string): Filters {
  const p = new URLSearchParams(search);
  const f = { ...defaults };
  for (const k of Object.keys(keys) as (keyof Filters)[])
    f[k] = p.get(keys[k]) || defaults[k];
  if (!GROUPS.some(([key]) => key === f.category)) f.category = "all";
  if (!["title", "artist"].includes(f.sort)) f.sort = "title";
  if (!["grid", "list"].includes(f.layout)) f.layout = "grid";
  return f;
}
export function filterQuery(f: Filters, tile = "") {
  const p = new URLSearchParams();
  for (const k of Object.keys(keys) as (keyof Filters)[])
    if (f[k] !== defaults[k]) p.set(keys[k], f[k]);
  if (tile) p.set("tile", tile);
  return p.toString();
}
export function matches(e: Entry, f: Filters) {
  if (f.category !== "all" && categoryOf(e) !== f.category) return false;
  if (f.subcategory !== "all" && e.subcategory !== f.subcategory) return false;
  if (f.generation !== "all" && e.generation !== f.generation) return false;
  if (f.artist !== "all" && e.artist !== f.artist) return false;
  const text = [
    e.title,
    e.artist,
    e.category_1,
    e.category_2,
    e.generation,
    e.subcategory,
    e.source_platform,
    details[e.source_url]?.excerpt || "",
  ]
    .join(" ")
    .toLocaleLowerCase();
  return f.search
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w));
}
export function results(f: Filters) {
  return entries
    .filter((e) => matches(e, f))
    .sort((a, b) => {
      if (f.sort === "artist") {
        const diff = a.artist.localeCompare(b.artist);
        if (diff) return diff;
      }
      return (
        cleanTitle(a.title).localeCompare(cleanTitle(b.title)) ||
        a.folder.localeCompare(b.folder)
      );
    });
}
