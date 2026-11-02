import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  defaults,
  entries,
  filterQuery,
  matches,
  readFilters,
  results,
  safeLink,
} from "../site/src/lib/catalog";

test("search combines words, descriptions and filters without losing entries", () => {
  assert.equal(results(defaults).length, entries.length);
  const target = entries[0];
  assert(
    matches(target, {
      ...defaults,
      search: target.artist + " " + target.subcategory,
    }),
  );
  assert(!matches(target, { ...defaults, search: "no-such-tileset-zzzz" }));
  assert(!matches(target, { ...defaults, category: "auto-tilesets" }));
});
test("URL filters round-trip including artist characters and legacy entry links", () => {
  const f = {
    ...defaults,
    artist: "Artist & Friends",
    search: "trees / buildings",
    layout: "list",
    sort: "artist",
  };
  const q = filterQuery(f, entries[0].folder);
  assert.deepEqual(readFilters(q), f);
  assert.equal(new URLSearchParams(q).get("tile"), entries[0].folder);
  assert.equal(
    readFilters("?category=invalid&view=broken&preview=other").category,
    "all",
  );
  assert.equal(safeLink("javascript:alert(1)"), "");
});
test("retired preview query parameters do not hide catalogue entries", () => {
  const filters = readFilters("?preview=available&sort=featured");
  assert.equal(results(filters).length, entries.length);
  assert.equal(filters.sort, "title");
  assert.equal(filterQuery(filters), "");
});
