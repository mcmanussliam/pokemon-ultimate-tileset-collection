<img src="./assets/banner.png" alt="Pokémon Ultimate Tileset Collection banner" width="100%" />

# Pokémon Ultimate Tileset Collection

This is an **unofficial readability fork** of the [original Pokémon Ultimate Tileset Collection spreadsheet](https://docs.google.com/spreadsheets/d/1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8/edit?gid=0#gid=0). The spreadsheet remains the source of truth. The repository is for easier navigation and search, not a claim of authorship.

[Browse the collection](https://mcmanussliam.github.io/pokemon-ultimate-tileset-collection/) or [open the original spreadsheet](https://docs.google.com/spreadsheets/d/1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8/edit?gid=0#gid=0).

## Directory structure

All entries are stored under `_tilesets`, organised by their original spreadsheet category, subcategory and item.

```text
_tilesets/
  outdoor-tilesets/
    beaches/
      beach-and-sea-tiles-peekychew/
        README.md
        metadata.json
  indoor-tilesets/
  indoor-outdoor-tilesets/
  misc-tilesets/
  animated-tilesets/
  auto-tilesets/
  in-out-misc-etc/
_catalog/
  catalog.json
scripts/
  sync.ts
site/
  src/
    main.ts
    style.css
```

| Sheet category | Browse |
| --- | --- |
| Outdoor | [_tilesets/outdoor-tilesets](_tilesets/outdoor-tilesets/) |
| Indoor | [_tilesets/indoor-tilesets](_tilesets/indoor-tilesets/) |
| Indoor + Outdoor | [_tilesets/indoor-outdoor-tilesets](_tilesets/indoor-outdoor-tilesets/) |
| Misc | [_tilesets/misc-tilesets](_tilesets/misc-tilesets/) |
| Animated | [_tilesets/animated-tilesets](_tilesets/animated-tilesets/) |
| Autotiles | [_tilesets/auto-tilesets](_tilesets/auto-tilesets/) |
| Collections | [_tilesets/in-out-misc-etc](_tilesets/in-out-misc-etc/) |

## Credits and usage

Each item links to its creator's original post and the source spreadsheet, with attribution and usage information as recorded in the sheet. The spreadsheet's noncommercial use notice does not imply permission to redistribute images. No image preview or image scraping system is currently included.

Individual tilesets belong to their respective artists. Pokémon and related marks belong to their owners. Corrections, attribution changes and removal requests are welcome through GitHub issues.

## Tooling

Node.js 22 or later:

```sh
npm install
npm run sync
npm run check
npm run build
```

The [sync workflow](.github/workflows/sync-catalog.yml) imports spreadsheet metadata into `_tilesets` and deploys the static TypeScript site to GitHub Pages.
