<img src="./assets/banner.png" alt="Pokémon Ultimate Tileset Collection banner" width="100%" />

# Pokémon Ultimate Tileset Collection

This is an **unofficial readability fork** of the [original Pokémon Ultimate Tileset Collection spreadsheet](https://docs.google.com/spreadsheets/d/1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8/edit?gid=0#gid=0). The spreadsheet remains the source of truth. The repository is for easier navigation and search, not a claim of authorship.

[Browse the collection](https://mcmanussliam.github.io/pokemon-ultimate-tileset-collection/) or [open the original spreadsheet](https://docs.google.com/spreadsheets/d/1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8/edit?gid=0#gid=0).

## Credits and usage

Each item links to its creator's original post and the source spreadsheet, with attribution and usage information as recorded in the sheet. The spreadsheet's noncommercial use notice does not imply permission to redistribute images. The viewer includes local artwork previews where a source image can be retrieved, and clearly identifies entries without one. Previews retain source attribution; consult the creator’s usage terms.

Individual tilesets belong to their respective artists. Pokémon and related marks belong to their owners. Corrections, attribution changes and removal requests are welcome through GitHub issues.

## Viewer

The viewer uses **React, TypeScript, Vite, Tailwind CSS and shadcn/ui**. Browse an image grid or compact list, search titles and source descriptions, and filter by category, type, generation, artist or preview availability. Open a tile for a larger preview with pixel zoom, background controls, attribution, local image download and a shareable entry link.

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

## Collection maintenance

- `npm run sync` refreshes the catalogue and folders from the original spreadsheet.
- `npm run enrich` refreshes source descriptions.
- `npm run previews` downloads accessible artwork into the collection. Existing previews are reused, and ordinary builds work offline.
- The **Download artwork previews** GitHub Actions workflow can be run manually to extend coverage.

See [preview downloading and contribution details](docs/previews.md) and the [latest source coverage report](_catalog/preview-report.json). Missing previews never hide catalogue entries.
