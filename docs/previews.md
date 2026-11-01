# Previews and source enrichment

The top-level README is intentionally not edited by this workflow.

## Current limitations

The original collection has 711 entries, including 613 links to DeviantArt. Its artwork pages and official oEmbed endpoint previously returned HTTP 403 to GitHub Actions. We do not bypass access controls or invent previews. The official DeviantArt API requires an application and OAuth credentials. OAuth alone does not give permission to rehost images.

## Source descriptions

Run npm install, followed by npm run enrich -- --limit=120. The metadata resolver tries official DeviantArt oEmbed and publicly accessible source page metadata. It writes short excerpts and candidate image URLs to _catalog/enrichment.json. Source errors are cached for 30 days and non-DeviantArt providers are tried first.

## Import approved thumbnails

Edit _catalog/preview-permissions.json. Use the exact source_url from the catalogue as the key. Supply approved: true, evidence_url proving permission for THIS INDEX to reproduce a small thumbnail, attribution crediting the artist, and optionally image_url for a stable direct image. Example:

    {
      "https://example.org/art/forest": {
        "approved": true,
        "evidence_url": "https://example.org/artist-permission",
        "attribution": "Original artist",
        "image_url": "https://example.org/forest.png"
      }
    }

Then run npm run enrich -- --local-only --limit=800 and npm run build.

The importer writes approved preview.webp and preview-credit.json alongside the tileset's existing metadata. Small WebP files are capped at 240 KB. Only approved files are copied into the GitHub Pages build. The original artwork and credit links remain available.

A public image or a noncommercial-use label alone does not authorise republishing it. Artists can request removal or credit corrections through GitHub issues.

## Automation

A manually triggered or monthly GitHub Actions workflow named Enrich source metadata and approved previews refreshes the catalogue. The source importer and site build are unchanged in purpose.

## Expanding coverage

Creators can submit authorised small previews by pull request, including permission evidence. Contact DeviantArt for API application access and clarify image caching rights before attempting large-scale hosting.

Contributors can also open the Contribute a tileset preview GitHub issue form from any tileset's detail view. The form requests a real artwork file, artist credit and evidence of permission.
