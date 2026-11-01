# Pokémon Ultimate Tileset Collection

An **unofficial, readability-focused fork of the [original Pokémon Ultimate Tileset Collection Google Sheet](https://docs.google.com/spreadsheets/d/1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8/edit?gid=0#gid=0)**.

> **Original catalogue and ongoing reference:** [Pokémon Ultimate Tileset Collection (Google Sheets)](https://docs.google.com/spreadsheets/d/1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8/edit?gid=0#gid=0).
>
> This repository is **just a fork/reorganisation for easier reading, browsing and finding tilesets**. It is **not** the original catalogue, an official continuation, or a claim of authorship over the sheet or any artist's work. Please visit the original sheet for corrections, updates and the original curators' context.

## Browse the collection

**711 linked tileset entries**, imported from the seven tabs of the source spreadsheet, with one Markdown README per entry:

| Original sheet category | Entries |
| --- | ---: |
| [Outdoor Tilesets](outdoor-tilesets/) | 382 |
| [Indoor Tilesets](indoor-tilesets/) | 90 |
| [Indoor + Outdoor Tilesets](indoor-outdoor-tilesets/) | 28 |
| [Misc Tilesets](misc-tilesets/) | 80 |
| [Animated Tilesets](animated-tilesets/) | 62 |
| [Auto Tilesets](auto-tilesets/) | 14 |
| [In + Out + Misc + etc.](in-out-misc-etc/) | 55 |

The full searchable metadata is in [`_catalog/catalog.json`](_catalog/catalog.json). Use [`scripts/import_sheet.py`](scripts/import_sheet.py) or the [GitHub Actions sync workflow](.github/workflows/sync-catalog.yml) to refresh the generated pages from the public sheet.

## How it's organised

Entries are grouped into kebab-case folders reflecting the original spreadsheet tabs, then a kebab-case folder for each tileset:

```text
outdoor-tilesets/
  beaches/
    beach-and-sea-tiles-by-peekychew/
      README.md
      tileset.png       # only when redistribution is permitted
```

Each entry's `README.md` should contain the tileset title, artist/submitted-by credit, source-page link, spreadsheet reference, generation or category information, and the artist's usage and attribution requirements. When permission allows, the original image is stored alongside the README; otherwise, follow the link to the creator's original download.

## Attribution and usage

**The original sheet explicitly states that its listed tilesets are for non-commercial use.** Its legend distinguishes entries requiring artist credit (`☆`) from those for which credit is unspecified or optional (`❉`), and warns readers to **check the original artwork page for the actual terms**.

- **Credit the individual artists** as required by each source, not just this repository or the spreadsheet.
- **Non-commercial use does not automatically grant redistribution rights.** Only copy or publish an artist's image in this repository when the creator's terms allow it.
- Some entries overlap multiple categories, contain animation/autotiles, or link to ROM bases from which graphics would need extracting. See the original entry before using.
- Pokémon and related marks belong to their respective owners; contributions by fan artists belong to their creators.

This repository provides organisation and discoverability. **It does not grant any additional licence to the tilesets.**

## Source and corrections

[Browse the source Google Sheet](https://docs.google.com/spreadsheets/d/1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8/edit?gid=0#gid=0). The Google Sheet remains the source of truth; names, links, credits and permissions should be checked there and against each artist's page.

If you spot a mistaken attribution or an asset that should not be mirrored, open an issue or pull request so the listing can be corrected or the file removed.
