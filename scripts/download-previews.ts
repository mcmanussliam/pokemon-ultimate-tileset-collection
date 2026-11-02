/** Download source artwork to local, bounded WebP previews. Never runs during a normal build. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(
  readFileSync(join(root, "_catalog/catalog.json"), "utf8"),
);
const seeds: Record<string, { url: string }> = JSON.parse(
  readFileSync(join(root, "_catalog/preview-sources.json"), "utf8"),
);
const output = join(root, "site/public/previews");
const manifestPath = join(root, "_catalog/previews.json");
type Preview = {
  file: string;
  image_url: string;
  width: number;
  height: number;
  downloaded_at: string;
  kind: "artwork" | "resource_thumbnail";
};
const manifest: Record<string, Preview> = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : {};
const rejectedHashes: string[] = JSON.parse(
  readFileSync(join(root, "_catalog/rejected-image-hashes.json"), "utf8"),
);
const MAX_BYTES = 20 * 1024 * 1024;
const imageHosts = [
  "deviantart.net",
  "wixmp.com",
  "deviantart.com",
  "imgur.com",
  "ibb.co",
  "eeveeexpo.com",
  "pokemmo.com",
  "bisafans.de",
  "spriters-resource.com",
  "redd.it",
  "redditmedia.com",
  "bulbagarden.net",
  "pokecommunity.com",
  "raw.githubusercontent.com",
];
export function publicUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      imageHosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h))
    );
  } catch {
    return false;
  }
}
function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
export function candidates(html: string, source: string): string[] {
  const results: string[] = [];
  const add = (s: string) => {
    try {
      const u = new URL(decode(s), source).href;
      if (
        publicUrl(u) &&
        !/avatar|logo|favicon|emoji|smilie|banner|spacer|\/styles\//i.test(u)
      )
        results.push(u);
    } catch {
      /* invalid image */
    }
  };
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((m) => [
        m[1].toLowerCase(),
        m[2],
      ]),
    );
    if (
      /^(og:image|twitter:image(?::src)?)$/.test(
        attrs.property || attrs.name || "",
      )
    )
      add(attrs.content || "");
  }
  // Explicit artwork classes and sheet image containers, never navigation images.
  const tags =
    html.match(/<img\b[^>]*\bclass=["'][^"']*\bbbImage\b[^"']*["'][^>]*>/gi) ||
    [];
  const sheet =
    html.match(/<img\b[^>]*\bid=["']sheet(?:-image)?["'][^>]*>/gi) || [];
  for (const tag of [...tags, ...sheet]) {
    const m = tag.match(/(?:data-src|src)=["']([^"']+)["']/i);
    if (m) add(m[1].replace(/^http:/, "https:"));
  }
  for (const tag of html.match(
    /<img\b[^>]*\bsrc=["'][^"']*\/data\/resource_icons\/[^"']+["'][^>]*>/gi,
  ) || []) {
    const m = tag.match(/src=["']([^"']+)["']/i);
    if (m) add(m[1]);
  }
  return [...new Set(results)];
}
async function get(url: string): Promise<Response> {
  for (let n = 0; n < 5; n++) {
    if (!publicUrl(url)) throw new Error("unsupported_host");
    const r = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "PokemonTilesetCollection/2.0 (source artwork preview index)",
      },
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      const next = new URL(r.headers.get("location")!, url).href;
      await r.body?.cancel();
      url = next;
      continue;
    }
    if (!r.ok) {
      await r.body?.cancel();
      throw new Error("http_" + r.status);
    }
    return r;
  }
  throw new Error("too_many_redirects");
}
async function bytes(r: Response): Promise<Buffer> {
  if (Number(r.headers.get("content-length")) > MAX_BYTES) {
    await r.body?.cancel();
    throw new Error("too_large");
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of r.body!) {
    length += chunk.length;
    if (length > MAX_BYTES) throw new Error("too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function discover(source: string): Promise<string[]> {
  const results: string[] = seeds[source]?.url ? [seeds[source].url] : [];
  try {
    if (source.includes("deviantart.com/")) {
      const r = await get(
        "https://backend.deviantart.com/oembed?format=json&url=" +
          encodeURIComponent(source),
      );
      if (!(r.headers.get("content-type") || "").includes("json")) {
        await r.body?.cancel();
        throw new Error("source_unavailable");
      }
      const data = JSON.parse((await bytes(r)).toString());
      if (data.url) results.push(data.url);
      if (data.thumbnail_url) results.push(data.thumbnail_url);
    } else {
      const r = await get(source);
      if ((r.headers.get("content-type") || "").startsWith("image/")) {
        await r.body?.cancel();
        results.push(source);
      } else results.push(...candidates((await bytes(r)).toString(), source));
    }
  } catch (error) {
    if (!results.length) throw error;
  }
  return results.filter(publicUrl);
}
async function download(source: string): Promise<void> {
  const urls = await discover(source);
  for (const image of urls.slice(0, 12)) {
    try {
      const response = await get(image);
      if (!(response.headers.get("content-type") || "").startsWith("image/")) {
        await response.body?.cancel();
        continue;
      }
      const input = await bytes(response);
      const instance = sharp(input, {
        limitInputPixels: 80_000_000,
        animated: false,
      });
      const meta = await instance.metadata();
      if (!meta.width || !meta.height || meta.width < 72 || meta.height < 48)
        continue;
      const name =
        createHash("sha256").update(source).digest("hex").slice(0, 20) +
        ".webp";
      const { data, info } = await instance
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 88 })
        .toBuffer({ resolveWithObject: true });
      if (
        rejectedHashes.includes(createHash("sha256").update(data).digest("hex"))
      )
        continue;
      writeFileSync(join(output, name), data);
      manifest[source] = {
        file: "previews/" + name,
        image_url: image,
        width: info.width,
        height: info.height,
        downloaded_at: new Date().toISOString(),
        kind: image.includes("/resource_icons/")
          ? "resource_thumbnail"
          : "artwork",
      };
      return;
    } catch {
      /* Try next source image, then record a missing preview. */
    }
  }
  throw new Error(urls.length ? "image_unavailable" : "no_image_found");
}
async function main() {
  mkdirSync(output, { recursive: true });
  const limitArg = process.argv.find((x) => x.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.slice(8)) : Infinity;
  if ((limitArg && !Number.isInteger(limit)) || limit < 0)
    throw new Error("Invalid --limit");
  const force = process.argv.includes("--force");
  const sources: string[] = [
    ...new Set<string>(
      catalog.entries.map((e: { source_url: string }) => e.source_url),
    ),
  ];
  const selected = sources
    .filter(
      (source) =>
        force ||
        !manifest[source]?.file ||
        !existsSync(join(root, "site/public", manifest[source].file)),
    )
    .sort(
      (a, b) =>
        Number(a.includes("deviantart.com")) -
        Number(b.includes("deviantart.com")),
    )
    .slice(0, limit);
  const errors: Record<string, string> = {};
  let cursor = 0,
    checked = 0;
  const save = () =>
    writeFileSync(
      manifestPath,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(manifest)
            .filter(([, v]) => v.file)
            .sort(),
        ),
        null,
        2,
      ) + "\n",
    );
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (cursor < selected.length) {
        const source = selected[cursor++];
        try {
          await download(source);
        } catch (e) {
          errors[source] = e instanceof Error ? e.message : "failed";
        }
        checked++;
        save();
        if (checked % 20 === 0)
          console.log(
            `Checked ${checked}/${selected.length}; downloaded ${Object.keys(manifest).filter((k) => manifest[k].file).length}`,
          );
      }
    }),
  );
  save();
  const covered = catalog.entries.filter(
    (e: { source_url: string }) => manifest[e.source_url]?.file,
  ).length;
  const report = {
    checked_at: new Date().toISOString(),
    total_entries: catalog.total,
    entries_with_preview: covered,
    local_images: Object.keys(manifest).length,
    attempted: selected.length,
    missing: errors,
  };
  writeFileSync(
    join(root, "_catalog/preview-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `${covered}/${catalog.total} entries have downloaded previews (${Object.keys(manifest).length} images). ${Object.keys(errors).length} sources unavailable; see _catalog/preview-report.json.`,
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
