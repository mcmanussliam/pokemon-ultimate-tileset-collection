#!/usr/bin/env python3
"""Import a public Google Sheets tileset index into browsable Markdown folders.

Only metadata and links are imported automatically. Artwork is not copied:
credit requirements and non-commercial permissions are not redistribution licences.
"""
import argparse
import json
import posixpath
import re
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO

SHEET_ID = "1hy3DqFFUu_H6Ddibr5evoqGW8aVSPHxSH6cZWuu9IR8"
SOURCE = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit"
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
N = {"m": MAIN_NS, "r": REL_NS, "p": PKG_NS}
USER_AGENT = "Mozilla/5.0 (compatible; TilesetCatalogImporter/1.0)"


def slug(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = value.encode("ascii", "ignore").decode("ascii").lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:90].strip("-") or "untitled"


def md(value):
    value = str(value or "").strip().replace("\n", " ")
    return re.sub(r"([\\[\]|])", r"\\\1", value)


def external_link(value):
    value = str(value or "").strip()
    parts = urllib.parse.urlsplit(value)
    return value if parts.scheme in ("http", "https") and parts.netloc else ""


def resolve(base, target):
    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(base), target))


def read_relations(archive, part):
    rel_file = posixpath.join(
        posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels"
    )
    if rel_file not in archive.namelist():
        return {}
    root = ET.fromstring(archive.read(rel_file))
    return {
        item.attrib["Id"]: (item.attrib.get("Target", ""), item.attrib.get("TargetMode", ""))
        for item in root.findall("p:Relationship", N)
    }


def shared_strings(archive):
    part = "xl/sharedStrings.xml"
    if part not in archive.namelist():
        return []
    root = ET.fromstring(archive.read(part))
    return [
        "".join(t.text or "" for t in si.findall(".//m:t", N))
        for si in root.findall("m:si", N)
    ]


def cell_text(cell, strings):
    kind = cell.attrib.get("t", "")
    if kind == "inlineStr":
        return "".join(x.text or "" for x in cell.findall(".//m:t", N)).strip()
    node = cell.find("m:v", N)
    value = node.text if node is not None and node.text is not None else ""
    if kind == "s" and value.isdigit():
        index = int(value)
        return strings[index] if index < len(strings) else ""
    return value.strip()


def load_tabs(data):
    with ZipFile(BytesIO(data)) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        wb_rels = read_relations(archive, "xl/workbook.xml")
        strings = shared_strings(archive)
        for sheet in workbook.findall("m:sheets/m:sheet", N):
            rid = sheet.attrib.get("{" + REL_NS + "}id", "")
            if rid not in wb_rels:
                continue
            target, mode = wb_rels[rid]
            if mode == "External":
                continue
            part = resolve("xl/workbook.xml", target)
            if part not in archive.namelist():
                continue
            sheet_root = ET.fromstring(archive.read(part))
            links = {}
            relations = read_relations(archive, part)
            for node in sheet_root.findall(".//m:hyperlink", N):
                ref = node.attrib.get("ref", "")
                url = node.attrib.get("location", "")
                link_id = node.attrib.get("{" + REL_NS + "}id")
                if link_id and link_id in relations:
                    url = relations[link_id][0]
                if external_link(url):
                    links[ref] = url
            rows = []
            for row in sheet_root.findall("m:sheetData/m:row", N):
                cells = {}
                for cell in row.findall("m:c", N):
                    ref = cell.attrib.get("r", "")
                    value = cell_text(cell, strings)
                    formula = cell.find("m:f", N)
                    if formula is not None and formula.text:
                        match = re.search(
                            r'HYPERLINK\(\s*"([^"]+)"', formula.text, flags=re.I
                        )
                        if match and ref not in links:
                            links[ref] = match.group(1)
                    cells[re.match(r"[A-Z]+", ref).group()] = {
                        "text": value,
                        "link": links.get(ref, "") or external_link(value),
                    } if re.match(r"[A-Z]+", ref) else {}
                rows.append((int(row.attrib.get("r", "0")), cells))
            yield {
                "title": sheet.attrib.get("name", "Untitled"),
                "gid": sheet.attrib.get("sheetId", "0"),
                "rows": rows,
            }


def headers_for(cells):
    names = {}
    for col, cell in cells.items():
        key = re.sub(r"[^a-z0-9]", "", cell["text"].lower())
        if key in ("artistsubmitter", "artist", "submitter"):
            names["artist"] = col
        elif key in ("category1", "primarycategory"):
            names["category_1"] = col
        elif key in ("category2", "secondarycategory"):
            names["category_2"] = col
        elif key in ("generation", "gen"):
            names["generation"] = col
        elif key in ("source", "website"):
            names["source_platform"] = col
        elif key in ("link", "sourcelink", "tilesetlink", "tileset"):
            names["title"] = col
        elif key in ("credits", "credit"):
            names["credits"] = col
        elif key in ("number", "no", "id"):
            names["number"] = col
    return names if "title" in names and ("artist" in names or "credits" in names) else None


def extract_entries(tabs):
    entries = []
    for tab in tabs:
        columns = None
        folder_counts = defaultdict(int)
        for number, cells in tab["rows"]:
            candidate = headers_for(cells)
            if candidate:
                columns = candidate
                continue
            if columns is None:
                continue

            def get(field):
                col = columns.get(field, "")
                return cells.get(col, {}).get("text", "").strip()

            title = get("title")
            if not title or title.lower() in ("link", "n/a", "-"):
                continue
            link_cell = cells.get(columns["title"], {})
            source_url = external_link(link_cell.get("link", ""))
            name = slug(title)
            folder_counts[name] += 1
            if folder_counts[name] > 1:
                name += "-" + slug(get("number") or str(number))
            category = slug(tab["title"])
            entry = {
                "title": title,
                "artist": get("artist"),
                "category_1": get("category_1"),
                "category_2": get("category_2"),
                "generation": get("generation"),
                "source_platform": get("source_platform"),
                "source_url": source_url,
                "credits": get("credits"),
                "number": get("number"),
                "sheet": tab["title"],
                "sheet_gid": tab["gid"],
                "sheet_row": number,
                "folder": category + "/" + name,
            }
            entries.append(entry)
    return entries


def row_link(entry):
    return SOURCE + "?gid=" + str(entry["sheet_gid"]) + "#range=A" + str(entry["sheet_row"])


def item_readme(item):
    source = (
        "[Open the creator/source page](" + item["source_url"] + ")"
        if item["source_url"] else
        "Not included in the exported hyperlink data. See the original sheet row."
    )
    credits = item["credits"]
    if "☆" in credits:
        credit_note = "The source sheet flags this entry as requiring artist credit."
    elif "❉" in credits:
        credit_note = "The source sheet marks artist credit as not specified/optional, but encourages credit."
    else:
        credit_note = "Check the artist's original page for attribution requirements."
    props = [
        ("Artist / submitter", item["artist"]),
        ("Original sheet tab", item["sheet"]),
        ("Primary category", item["category_1"]),
        ("Secondary category", item["category_2"]),
        ("Generation", item["generation"]),
        ("Source platform", item["source_platform"]),
        ("Sheet entry number", item["number"]),
    ]
    details = "\n".join(
        "- **" + key + ":** " + md(value)
        for key, value in props if value
    )
    return (
        "<!-- Generated by scripts/import_sheet.py; source: original Google Sheet -->\n"
        "# " + md(item["title"]) + "\n\n"
        "## Description\n\n"
        "A Pokémon tileset indexed under **" + md(item["sheet"]) + "** in the original collection. "
        "See the source page for the tileset image, description, formats, and further details.\n\n"
        + details + "\n\n"
        "## Sources\n\n"
        "- **Original artwork / download:** " + source + "\n"
        "- **Original catalogue entry:** [View in the Google Sheet](" + row_link(item) + ")\n"
        "- **Full original spreadsheet:** [Pokémon Ultimate Tileset Collection](" + SOURCE + ")\n\n"
        "## Usage and credits\n\n"
        + md(credit_note) + "\n\n"
        "The original sheet says its listed assets are for **non-commercial use**. "
        "Always review the creator's page for the actual licence, mandatory credits, "
        "allowed modifications, formats, and whether redistribution is permitted. "
        "This index grants no licence to the image.\n\n"
        "## Tileset image\n\n"
        "The image is **not mirrored automatically** because permission to use a tileset "
        "does not necessarily include permission to republish its source file. "
        "Use the original artwork/download link above. When redistribution is expressly "
        "allowed and documented, an image can be added beside this README.\n"
    )


def index_readme(tab, items):
    title = tab["title"]
    gid = tab["gid"]
    output = [
        "<!-- Generated by scripts/import_sheet.py -->",
        "# " + md(title),
        "",
        "An easier-to-browse index of the [original Google Sheet](" + SOURCE
        + "?gid=" + str(gid) + "). This is an unofficial readability fork.",
        "",
        "Artwork remains the property of its original artists; check each entry's usage terms.",
        "",
        "**" + str(len(items)) + " entries**",
        "",
    ]
    for item in items:
        part = item["folder"].split("/", 1)[1]
        summary = (" — " + md(item["artist"])) if item["artist"] else ""
        output.append("- [" + md(item["title"]) + "](" + part + "/)" + summary)
    return "\n".join(output) + "\n"


def write_if_changed(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=".", help="Repository root")
    parser.add_argument("--input-xlsx", help="Use a previously exported workbook (offline)")
    args = parser.parse_args()
    dest = Path(args.output).resolve()
    if args.input_xlsx:
        data = Path(args.input_xlsx).read_bytes()
    else:
        url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/export?format=xlsx"
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=90) as response:
            data = response.read()
    if not data.startswith(b"PK"):
        raise ValueError("Expected an XLSX file. The source sheet may require authentication.")
    tabs = list(load_tabs(data))
    entries = extract_entries(tabs)
    if not entries:
        raise ValueError("No tileset entries found: please check sheet access/export layout.")
    by_tab = defaultdict(list)
    for item in entries:
        by_tab[item["sheet"]].append(item)
    changed = 0
    for item in entries:
        folder = dest / item["folder"]
        path = folder / "README.md"
        if path.exists() and not path.read_text(encoding="utf-8").startswith(
            "<!-- Generated by scripts/import_sheet.py"
        ):
            print("Skipping manually edited " + str(path))
            continue
        changed += write_if_changed(path, item_readme(item))
    for tab in tabs:
        if by_tab[tab["title"]]:
            path = dest / slug(tab["title"]) / "README.md"
            changed += write_if_changed(path, index_readme(tab, by_tab[tab["title"]]))
    manifest = json.dumps(
        {
            "source_spreadsheet": SOURCE,
            "notice": "Index only. Art credits and permission must be verified with artists.",
            "total": len(entries),
            "entries": entries,
        },
        ensure_ascii=False, indent=2
    ) + "\n"
    changed += write_if_changed(dest / "_catalog" / "catalog.json", manifest)
    print("Imported {} tileset listings across {} spreadsheet tabs; {} files updated.".format(
        len(entries), len(by_tab), changed
    ))


if __name__ == "__main__":
    run()
