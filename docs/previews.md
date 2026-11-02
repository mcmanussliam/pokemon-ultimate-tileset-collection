# Local artwork previews

The React viewer uses downloaded WebP images from `site/public/previews/`, indexed by the exact catalogue `source_url` in `_catalog/previews.json`. Images are bundled into the GitHub Pages build; viewing the collection does not contact external image hosts. The spreadsheet sync does not overwrite the preview manifest or images.

## Download and update

```sh
npm ci
npm run previews
npm run test
npm run build
```

The downloader checks every source without a saved preview, eight sources at a time. `npm run previews -- --limit=100` bounds a run; `--force` refreshes existing previews. Successful files are checkpointed as they arrive. An unsuccessful refresh preserves a previously saved image. Normal site builds do not scrape sources or depend on their availability.

Source resolution supports official DeviantArt oEmbed metadata, artwork in public forum posts, source social metadata, resource thumbnails, and sheet images. It does not authenticate or bypass source restrictions. HTTPS image hosts are restricted to the known collection providers; redirects are checked, downloads are bounded to 20 MB, and decoded images to 80 megapixels. Previews retain their aspect ratio, are at most 1600 × 1600 pixels, and keep the first frame of animated images. The original source remains the place to get the full tileset and animation.

`_catalog/preview-report.json` records how many catalogue entries have a local preview and why unresolved sources failed. A successful HTTP response is not sufficient: known site icons and unavailable-image placeholders are excluded. Review new images visually before merging changes, since source pages can change.

## Add or correct a source image

Add an exact source URL to `_catalog/preview-sources.json`, with `url` pointing at the public artwork image. This provides a candidate when a source page cannot be resolved automatically. The downloader validates and downloads it. To replace an existing preview, use `--force`. Never substitute unrelated artwork for a missing preview.

For a rejected placeholder, add the SHA-256 of the generated WebP to `_catalog/rejected-image-hashes.json`. The downloader then tries the next image candidate. Artists can request credit corrections or removal through GitHub issues; remove both the manifest record and its corresponding local image when needed.

## Attribution

Each catalogue entry preserves the artist/submitter, original source, spreadsheet credit marker, category and generation. Preview provenance records the original image URL and download time. A preview download is not a licence to use a tileset: consult the creator's original terms. This collection is an unofficial index.

## Framework and UI

The viewer is a React + TypeScript application built with Vite and Tailwind CSS v4. The components in `site/src/components/ui/` are the shadcn/ui New York Radix components, with local import paths. `components.json` is provided for future shadcn CLI additions. Search, filters, sort, layout and selected entries can be shared through URL parameters. The `view=list`, `q`, `category`, `type`, `gen` and legacy `tile` IDs remain supported.
