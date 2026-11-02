import { strict as assert } from "node:assert";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  defaults,
  entries,
  filterQuery,
  matches,
  previews,
  readFilters,
  results,
  safeLink,
} from "../site/src/lib/catalog";
import { candidates, publicUrl } from "../scripts/download-previews";

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
  const available = results({ ...defaults, preview: "available" }),
    missing = results({ ...defaults, preview: "missing" });
  assert.equal(available.length + missing.length, entries.length);
  assert(available.every((e) => previews[e.source_url]));
  assert.equal(new Set(available.map((e) => e.folder)).size, available.length);
});
test("URL filters round-trip including artist characters and legacy entry links", () => {
  const f = {
    ...defaults,
    artist: "Artist & Friends",
    search: "trees / buildings",
    preview: "available",
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
test("downloaded previews exist and contain artwork rather than known error images", () => {
  const rejected = JSON.parse(
    readFileSync(
      new URL("../_catalog/rejected-image-hashes.json", import.meta.url),
      "utf8",
    ),
  );
  for (const image of Object.values(previews)) {
    assert(/^previews\/[a-f0-9]{20}\.webp$/.test(image.file));
    const path = new URL("../site/public/" + image.file, import.meta.url);
    assert(existsSync(path));
    assert(
      !rejected.includes(
        createHash("sha256").update(readFileSync(path)).digest("hex"),
      ),
    );
    assert(image.width >= 72 && image.height >= 48);
    assert(publicUrl(image.image_url));
    assert(!image.image_url.includes("/styles/"));
  }
});
test("source resolver ignores forum logos and avatars but accepts post images", () => {
  const html =
    '<meta property="og:image" content="https://eeveeexpo.com/styles/default/ee_icon_resized.png"><img src="/data/avatars/a.png"><img src="https://i.imgur.com/tiles.png" class="bbImage"><img src="/data/resource_icons/1/123.jpg">';
  assert.deepEqual(candidates(html, "https://eeveeexpo.com/resources/123/"), [
    "https://i.imgur.com/tiles.png",
    "https://eeveeexpo.com/data/resource_icons/1/123.jpg",
  ]);
  for (const s of [
    "http://i.imgur.com/a.png",
    "https://localhost/a",
    "https://i.imgur.com.evil.test/a.png",
    "https://user:password@i.imgur.com/a.png",
    "https://i.imgur.com:444/a.png",
  ])
    assert(!publicUrl(s));
});
